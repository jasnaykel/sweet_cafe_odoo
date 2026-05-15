# -*- coding: utf-8 -*-
from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    configurator_ai_provider = fields.Selection([
        ('stability', 'Stability AI'),
        ('leonardo', 'Leonardo AI'),
        ('openai', 'OpenAI DALL-E'),
        ('none', 'Sin IA (solo editor manual)'),
    ], string='Proveedor de IA para imágenes',
        config_parameter='sweet_cafe_configurator.ai_provider',
        default='none',
    )
    configurator_ai_api_key = fields.Char(
        string='API Key del proveedor de IA',
        config_parameter='sweet_cafe_configurator.ai_api_key',
    )
    configurator_ai_model = fields.Char(
        string='Modelo de IA',
        config_parameter='sweet_cafe_configurator.ai_model',
        default='stable-diffusion-xl-1024-v1-0',
        help='Identificador del modelo (e.g., stable-diffusion-xl-1024-v1-0, dall-e-3)',
    )
