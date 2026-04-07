# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class PosConfig(models.Model):
    """Extends pos.config to link POS sessions to a Sweet Café branch."""
    _inherit = 'pos.config'

    branch_id = fields.Many2one(
        'sweet.branch',
        string='Sucursal',
        help='Sucursal Sweet Café a la que pertenece este punto de venta',
        ondelete='restrict',
    )
