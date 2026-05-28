# -*- coding: utf-8 -*-
import base64
import json
import logging
import requests

from odoo import http, _
from odoo.http import request

_logger = logging.getLogger(__name__)

# Timeout for external AI API calls (seconds)
_AI_TIMEOUT = 60


class ProductConfiguratorController(http.Controller):
    """Controlador del configurador visual de productos con IA."""

    # ─────────────────────────────────────────────
    # Página del configurador
    # ─────────────────────────────────────────────

    @http.route('/configurador/<int:product_id>', type='http', auth='public',
                website=True, sitemap=False)
    def configurator_page(self, product_id, design_id=None, **kwargs):
        """Página pública del configurador interactivo."""
        product = request.env['product.template'].sudo().browse(product_id)
        if not product.exists() or not product.custom_order:
            return request.redirect('/reservar')

        DesignOption = request.env['product.design.option'].sudo()
        design = None
        if design_id:
            design = request.env['product.design'].sudo().browse(int(design_id))
            if not design.exists():
                design = None

        return request.render('sweet_cafe_configurator.configurator_page', {
            'product': product,
            'design': design,
            'flavors': DesignOption.search([('category', '=', 'flavor'), ('active', '=', True)]),
            'fillings': DesignOption.search([('category', '=', 'filling'), ('active', '=', True)]),
            'frostings': DesignOption.search([('category', '=', 'frosting'), ('active', '=', True)]),
            'decorations': DesignOption.search([('category', '=', 'decoration'), ('active', '=', True)]),
            'toppings': DesignOption.search([('category', '=', 'topping'), ('active', '=', True)]),
        })

    # ─────────────────────────────────────────────
    # API: Generar imagen con IA
    # ─────────────────────────────────────────────

    @http.route('/configurador/generar-imagen', type='jsonrpc', auth='public',
                website=True, methods=['POST'])
    def generate_ai_image(self, **params):
        """Recibe los parámetros del configurador, construye un prompt y llama
        a la API de IA configurada para generar la imagen base del pastel.

        Retorna la imagen en base64 y el design_id creado/actualizado.
        """
        product_id = int(params.get('product_id', 0))
        product = request.env['product.template'].sudo().browse(product_id)
        if not product.exists():
            return {'error': _('Producto no encontrado.')}

        # Crear o actualizar el diseño — con validación de propiedad (anti-IDOR)
        Design = request.env['product.design'].sudo()
        design_id = params.get('design_id')
        vals = self._params_to_design_vals(params, product_id)

        current_partner = request.env.user.partner_id if request.env.user else None

        if design_id:
            design = Design.browse(int(design_id))
            if not design.exists():
                design = Design.create(vals)
            elif design.partner_id and current_partner and design.partner_id != current_partner:
                # Diseño pertenece a otro usuario — denegar modificación
                _logger.warning(
                    'IDOR attempt blocked: user %s tried to modify design %s owned by partner %s',
                    request.env.user.login if request.env.user else 'anonymous',
                    design_id,
                    design.partner_id.name,
                )
                return {'error': _('Acceso denegado: este diseño no te pertenece.')}
            else:
                design.write(vals)
        else:
            design = Design.create(vals)

        # Construir prompt y llamar a la IA
        prompt = design.build_ai_prompt()
        design.ai_prompt_used = prompt

        ICP = request.env['ir.config_parameter'].sudo()
        provider = ICP.get_param('sweet_cafe_configurator.ai_provider', 'none')
        api_key = ICP.get_param('sweet_cafe_configurator.ai_api_key', '')
        ai_model = ICP.get_param('sweet_cafe_configurator.ai_model', '')

        image_b64 = None
        error = None
        use_product_image = False

        if provider == 'none' or not api_key:
            # Sin IA: usar imagen del producto como base
            if product.image_512:
                image_b64 = product.image_512.decode('utf-8') if isinstance(product.image_512, bytes) else product.image_512
                use_product_image = True
            else:
                # Generate a simple placeholder cake image (white canvas)
                # The user can then decorate it in the editor
                error = _('No hay proveedor de IA configurado. Se creó un lienzo en blanco para decorar.')
                # Return without image — JS will start with blank canvas
                return {
                    'design_id': design.id,
                    'prompt': prompt,
                    'image': None,
                    'error': error,
                    'blank_canvas': True,
                }
        else:
            try:
                image_b64 = self._call_ai_api(provider, api_key, ai_model, prompt)
            except Exception as e:
                _logger.exception('Error calling AI API: %s', e)
                error = str(e)
                # Fallback: use product image
                if product.image_512:
                    image_b64 = product.image_512.decode('utf-8') if isinstance(product.image_512, bytes) else product.image_512

        if image_b64:
            design.write({
                'ai_generated_image': image_b64,
                'state': 'ai_generated',
            })

        # Resolve option names/colors for the JS renderer
        # Re-browse to ensure relational fields are fresh after write
        Design = request.env['product.design'].sudo()
        design = Design.browse(design.id)
        option_data = {}
        if design.flavor_id:
            option_data['flavor_name'] = design.flavor_id.name
            option_data['flavor_color'] = design.flavor_id.color or ''
        if design.filling_id:
            option_data['filling_name'] = design.filling_id.name
            option_data['filling_color'] = design.filling_id.color or ''
        if design.frosting_id:
            option_data['frosting_name'] = design.frosting_id.name
            option_data['frosting_color'] = design.frosting_id.color or ''
        if design.decoration_ids:
            option_data['decoration_names'] = design.decoration_ids.mapped('name')
        if design.topping_ids:
            option_data['topping_names'] = design.topping_ids.mapped('name')

        return {
            'design_id': design.id,
            'image': image_b64,
            'prompt': prompt,
            'error': error,
            'use_product_image': use_product_image,
            **option_data,
        }

    # ─────────────────────────────────────────────
    # API: Guardar diseño final del editor
    # ─────────────────────────────────────────────

    @http.route('/configurador/guardar-diseno', type='jsonrpc', auth='public',
                website=True, methods=['POST'])
    def save_design(self, design_id, image_data, editor_state=None, **kwargs):
        """Guarda la imagen final editada por el cliente (PNG base64) y
        opcionalmente el estado JSON del canvas para futura edición."""
        design = request.env['product.design'].sudo().browse(int(design_id))
        if not design.exists():
            return {'error': _('Diseño no encontrado.')}

        # image_data llega como data:image/png;base64,XXXXX
        if ',' in image_data:
            image_data = image_data.split(',', 1)[1]

        vals = {
            'final_design_image': image_data,
            'state': 'edited',
        }
        if editor_state:
            vals['editor_state_json'] = (
                json.dumps(editor_state) if isinstance(editor_state, dict) else editor_state
            )
        design.write(vals)
        return {'success': True, 'design_id': design.id}

    # ─────────────────────────────────────────────
    # API: Obtener opciones del configurador
    # ─────────────────────────────────────────────

    @http.route('/configurador/opciones', type='jsonrpc', auth='public',
                website=True)
    def get_options(self, category=None, **kwargs):
        """Devuelve las opciones disponibles para una categoría."""
        domain = [('active', '=', True)]
        if category:
            domain.append(('category', '=', category))
        options = request.env['product.design.option'].sudo().search(domain)
        return [{
            'id': o.id,
            'name': o.name,
            'category': o.category,
            'color': o.color,
            'extra_price': o.extra_price,
            'image_url': '/web/image/product.design.option/%d/image' % o.id if o.image else None,
        } for o in options]

    # ─────────────────────────────────────────────
    # API: Cargar diseño existente
    # ─────────────────────────────────────────────

    @http.route('/configurador/cargar-diseno', type='jsonrpc', auth='public',
                website=True)
    def load_design(self, design_id, **kwargs):
        """Carga un diseño existente para continuar editando."""
        design = request.env['product.design'].sudo().browse(int(design_id))
        if not design.exists():
            return {'error': _('Diseño no encontrado.')}
        return {
            'design_id': design.id,
            'product_id': design.product_id.id,
            'cake_layers': design.cake_layers,
            'cake_shape': design.cake_shape,
            'cake_size': design.cake_size,
            'flavor_id': design.flavor_id.id if design.flavor_id else None,
            'flavor_name': design.flavor_id.name if design.flavor_id else '',
            'flavor_color': design.flavor_id.color if design.flavor_id else '',
            'filling_id': design.filling_id.id if design.filling_id else None,
            'filling_name': design.filling_id.name if design.filling_id else '',
            'filling_color': design.filling_id.color if design.filling_id else '',
            'frosting_id': design.frosting_id.id if design.frosting_id else None,
            'frosting_name': design.frosting_id.name if design.frosting_id else '',
            'frosting_color': design.frosting_id.color if design.frosting_id else '',
            'decoration_ids': design.decoration_ids.ids,
            'decoration_names': design.decoration_ids.mapped('name'),
            'topping_ids': design.topping_ids.ids,
            'topping_names': design.topping_ids.mapped('name'),
            'primary_color': design.primary_color,
            'secondary_color': design.secondary_color,
            'accent_color': design.accent_color,
            'custom_message': design.custom_message,
            'message_font': design.message_font,
            'extra_notes': design.extra_notes,
            'ai_image': design.ai_generated_image.decode('utf-8') if design.ai_generated_image and isinstance(design.ai_generated_image, bytes) else design.ai_generated_image,
            'final_image': design.final_design_image.decode('utf-8') if design.final_design_image and isinstance(design.final_design_image, bytes) else design.final_design_image,
            'editor_state': design.editor_state_json,
            'state': design.state,
        }

    # ─────────────────────────────────────────────
    # Helpers privados
    # ─────────────────────────────────────────────

    def _params_to_design_vals(self, params, product_id):
        """Convierte parámetros del frontend a valores del modelo."""
        vals = {'product_id': product_id}

        simple_fields = [
            'cake_layers', 'cake_shape', 'cake_size',
            'primary_color', 'secondary_color', 'accent_color',
            'custom_message', 'message_font', 'extra_notes',
        ]
        for f in simple_fields:
            if f in params:
                vals[f] = params[f]

        m2o_fields = ['flavor_id', 'filling_id', 'frosting_id']
        for f in m2o_fields:
            if f in params and params[f]:
                vals[f] = int(params[f])

        if 'decoration_ids' in params:
            ids = [int(i) for i in params['decoration_ids'] if i]
            vals['decoration_ids'] = [(6, 0, ids)]
        if 'topping_ids' in params:
            ids = [int(i) for i in params['topping_ids'] if i]
            vals['topping_ids'] = [(6, 0, ids)]

        return vals

    def _call_ai_api(self, provider, api_key, model, prompt):
        """Llama a la API del proveedor de IA y retorna la imagen en base64.

        Soporta: Stability AI, Leonardo AI, OpenAI DALL-E.
        """
        if provider == 'stability':
            return self._call_stability(api_key, model, prompt)
        elif provider == 'leonardo':
            return self._call_leonardo(api_key, model, prompt)
        elif provider == 'openai':
            return self._call_openai(api_key, model, prompt)
        raise ValueError(_('Proveedor de IA no soportado: %s') % provider)

    def _call_stability(self, api_key, model, prompt):
        """Stability AI (SDXL) — Text to Image."""
        url = f'https://api.stability.ai/v1/generation/{model or "stable-diffusion-xl-1024-v1-0"}/text-to-image'
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        payload = {
            'text_prompts': [{'text': prompt, 'weight': 1}],
            'cfg_scale': 7,
            'width': 1024,
            'height': 1024,
            'samples': 1,
            'steps': 30,
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=_AI_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        return data['artifacts'][0]['base64']

    def _call_leonardo(self, api_key, model, prompt):
        """Leonardo AI — Text to Image (v2)."""
        url = 'https://cloud.leonardo.ai/api/rest/v1/generations'
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        payload = {
            'prompt': prompt,
            'modelId': model or 'ac614f96-1082-45bf-be9d-757f2d31c174',
            'width': 1024,
            'height': 1024,
            'num_images': 1,
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=_AI_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        generation_id = data.get('sdGenerationJob', {}).get('generationId')
        if not generation_id:
            raise ValueError('Leonardo no devolvió generationId')

        # Poll for completion (Leonardo is async)
        import time
        poll_url = f'https://cloud.leonardo.ai/api/rest/v1/generations/{generation_id}'
        for _attempt in range(30):
            time.sleep(2)
            poll_resp = requests.get(poll_url, headers=headers, timeout=_AI_TIMEOUT)
            poll_resp.raise_for_status()
            poll_data = poll_resp.json()
            images = poll_data.get('generations_by_pk', {}).get('generated_images', [])
            if images:
                img_url = images[0].get('url')
                if img_url:
                    img_resp = requests.get(img_url, timeout=_AI_TIMEOUT)
                    img_resp.raise_for_status()
                    return base64.b64encode(img_resp.content).decode('utf-8')
        raise TimeoutError('Leonardo AI no completó la generación a tiempo.')

    def _call_openai(self, api_key, model, prompt):
        """OpenAI DALL-E — Image generation."""
        url = 'https://api.openai.com/v1/images/generations'
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        payload = {
            'model': model or 'dall-e-3',
            'prompt': prompt,
            'n': 1,
            'size': '1024x1024',
            'response_format': 'b64_json',
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=_AI_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        return data['data'][0]['b64_json']
