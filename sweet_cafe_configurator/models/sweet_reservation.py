# -*- coding: utf-8 -*-
from odoo import fields, models


class SweetReservationLine(models.Model):
    """Extiende la línea de reserva para vincular un diseño personalizado."""
    _inherit = 'sweet.reservation.line'

    design_id = fields.Many2one(
        'product.design', string='Diseño Personalizado',
        help='Diseño visual creado por el cliente en el configurador interactivo.',
    )
    design_image = fields.Binary(
        related='design_id.final_design_image',
        string='Imagen del Diseño', readonly=True,
    )
