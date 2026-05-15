# -*- coding: utf-8 -*-
from odoo import api, fields, models, _


class ProductDesign(models.Model):
    """Diseño personalizado de un producto creado por un cliente.

    Almacena tanto los parámetros de configuración (pisos, sabor, decoración)
    como la imagen generada por IA y la imagen final editada por el cliente.
    """
    _name = 'product.design'
    _description = 'Diseño Personalizado de Producto'
    _inherit = ['mail.thread']
    _order = 'create_date desc'
    _rec_name = 'display_name'

    # ─── Producto base ─────────────────────────────────────────
    product_id = fields.Many2one(
        'product.template', string='Producto Base', required=True,
        domain="[('custom_order', '=', True)]",
    )
    partner_id = fields.Many2one('res.partner', string='Cliente')

    # ─── Configuración del pastel ──────────────────────────────
    cake_layers = fields.Selection([
        ('1', '1 piso'),
        ('2', '2 pisos'),
        ('3', '3 pisos'),
        ('4', '4 pisos'),
        ('5', '5 pisos'),
    ], string='Número de Pisos', default='1')

    cake_shape = fields.Selection([
        ('round', 'Redondo'),
        ('square', 'Cuadrado'),
        ('heart', 'Corazón'),
        ('rectangular', 'Rectangular'),
        ('hexagonal', 'Hexagonal'),
    ], string='Forma', default='round')

    cake_size = fields.Selection([
        ('small', 'Pequeño (15 cm)'),
        ('medium', 'Mediano (20 cm)'),
        ('large', 'Grande (25 cm)'),
        ('xl', 'Extra grande (30 cm)'),
    ], string='Tamaño', default='medium')

    flavor_id = fields.Many2one(
        'product.design.option', string='Sabor Principal',
        domain="[('category', '=', 'flavor')]",
    )
    filling_id = fields.Many2one(
        'product.design.option', string='Relleno',
        domain="[('category', '=', 'filling')]",
    )
    frosting_id = fields.Many2one(
        'product.design.option', string='Cobertura',
        domain="[('category', '=', 'frosting')]",
    )
    decoration_ids = fields.Many2many(
        'product.design.option', 'design_decoration_rel',
        'design_id', 'option_id',
        string='Decoraciones',
        domain="[('category', '=', 'decoration')]",
    )
    topping_ids = fields.Many2many(
        'product.design.option', 'design_topping_rel',
        'design_id', 'option_id',
        string='Toppings',
        domain="[('category', '=', 'topping')]",
    )

    # ─── Colores ───────────────────────────────────────────────
    primary_color = fields.Char(string='Color Principal', default='#F5E6D3')
    secondary_color = fields.Char(string='Color Secundario', default='#D4A574')
    accent_color = fields.Char(string='Color de Acento', default='#E8A0BF')

    # ─── Texto personalizado ───────────────────────────────────
    custom_message = fields.Char(string='Mensaje Personalizado', size=80)
    message_font = fields.Selection([
        ('cursive', 'Cursiva Elegante'),
        ('bold', 'Negrita Clásica'),
        ('handwritten', 'Manuscrita'),
        ('modern', 'Moderna'),
    ], string='Tipografía del Mensaje', default='cursive')

    # ─── Imágenes ──────────────────────────────────────────────
    ai_generated_image = fields.Binary(
        string='Imagen Generada por IA', attachment=True,
    )
    ai_prompt_used = fields.Text(string='Prompt Utilizado (IA)')
    final_design_image = fields.Binary(
        string='Diseño Final del Cliente', attachment=True,
    )
    editor_state_json = fields.Text(
        string='Estado del Editor (JSON)',
        help='Serialización JSON del canvas Fabric.js para poder reabrir y editar.',
    )

    # ─── Notas / extras ───────────────────────────────────────
    extra_notes = fields.Text(string='Notas Adicionales')
    state = fields.Selection([
        ('draft', 'Borrador'),
        ('ai_generated', 'IA Generada'),
        ('edited', 'Editado por Cliente'),
        ('confirmed', 'Confirmado'),
    ], string='Estado', default='draft')

    display_name = fields.Char(compute='_compute_display_name', store=True)

    @api.depends('product_id.name', 'partner_id.name', 'create_date')
    def _compute_display_name(self):
        for rec in self:
            parts = []
            if rec.product_id:
                parts.append(rec.product_id.name)
            if rec.partner_id:
                parts.append(rec.partner_id.name)
            rec.display_name = ' — '.join(parts) if parts else _('Nuevo Diseño')

    def build_ai_prompt(self):
        """Construye un prompt descriptivo para la API de generación de imágenes."""
        self.ensure_one()
        parts = [
            "Professional food photography of a",
            f"{dict(self._fields['cake_size'].selection).get(self.cake_size, '')} ",
            f"{dict(self._fields['cake_shape'].selection).get(self.cake_shape, 'round')} cake",
            f"with {self.cake_layers or '1'} tier(s).",
        ]
        if self.flavor_id:
            parts.append(f"Flavor: {self.flavor_id.name}.")
        if self.filling_id:
            parts.append(f"Filling: {self.filling_id.name}.")
        if self.frosting_id:
            parts.append(f"Frosting: {self.frosting_id.name}.")
        if self.decoration_ids:
            decs = ', '.join(self.decoration_ids.mapped('name'))
            parts.append(f"Decorated with {decs}.")
        if self.topping_ids:
            tops = ', '.join(self.topping_ids.mapped('name'))
            parts.append(f"Topped with {tops}.")
        if self.primary_color:
            parts.append(f"Primary color: {self.primary_color}.")
        if self.secondary_color:
            parts.append(f"Secondary color: {self.secondary_color}.")
        if self.custom_message:
            parts.append(f'With message "{self.custom_message}" written on top.')

        parts.append(
            "White background, soft studio lighting, "
            "ultra realistic, premium aesthetic, 8K detail, centered composition."
        )
        return ' '.join(parts)


class ProductDesignOption(models.Model):
    """Opción reutilizable para el configurador de diseños (sabor, relleno,
    decoración, topping, cobertura)."""
    _name = 'product.design.option'
    _description = 'Opción de Diseño de Producto'
    _order = 'category, sequence, name'

    name = fields.Char(string='Nombre', required=True, translate=True)
    category = fields.Selection([
        ('flavor', 'Sabor'),
        ('filling', 'Relleno'),
        ('frosting', 'Cobertura'),
        ('decoration', 'Decoración'),
        ('topping', 'Topping'),
    ], string='Categoría', required=True, index=True)
    sequence = fields.Integer(default=10)
    image = fields.Binary(string='Imagen / Ícono', attachment=True)
    color = fields.Char(string='Color Representativo')
    active = fields.Boolean(default=True)
    description = fields.Text(string='Descripción')
    extra_price = fields.Float(string='Precio Adicional', default=0.0)
