# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class ResCompany(models.Model):
    """Extends res.company with Sweet Café multi-branch configuration."""
    _inherit = 'res.company'

    allow_cup_mlc = fields.Boolean(
        string='Habilitar Doble Moneda (CUP/MLC)',
        default=False,
        help='Permite registrar pagos en CUP y MLC en el POS',
    )
    main_branch_id = fields.Many2one(
        'sweet.branch',
        string='Sucursal Principal (Matriz)',
        help='Sucursal matriz de esta compañía',
    )
