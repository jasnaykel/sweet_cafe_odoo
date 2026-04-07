# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class SweetScrapReason(models.Model):
    """Reason / cause for a scrap/merma event at Sweet Café."""
    _name = 'sweet.scrap.reason'
    _description = 'Motivo de Merma'
    _order = 'sequence, name'

    name = fields.Char(
        string='Motivo',
        required=True,
        translate=True,
    )
    sequence = fields.Integer(
        string='Secuencia',
        default=10,
    )
    loss_type = fields.Selection(
        selection=[
            ('tecnica', 'Merma Técnica (proceso productivo)'),
            ('negligencia', 'Merma por Negligencia'),
            ('caducidad', 'Caducidad / Vencimiento'),
            ('rotura', 'Rotura / Daño'),
            ('robo', 'Robo / Pérdida'),
            ('otro', 'Otro'),
        ],
        string='Tipo de Pérdida',
        required=True,
        default='otro',
    )
    active = fields.Boolean(
        string='Activo',
        default=True,
    )
    note = fields.Text(string='Descripción')
