# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.
"""
Tramos Impositivos Progresivos — Cuba.

Define los tramos del Impuesto sobre los Ingresos (IS) para TCP y MIPYME
conforme al Decreto 308/2012 del Consejo de Ministros y resoluciones
vigentes del MFP/ONAT. Los tramos se expresan en CUP anuales y son
editables desde la interfaz para adaptarse a cambios normativos.
"""

from odoo import fields, models


class SweetTaxBracket(models.Model):
    """Tramo impositivo progresivo para el IS (Cuba) — Ley 113 / Decreto 308."""

    _name = 'sweet.tax.bracket'
    _description = 'Tramo Impositivo Progresivo (Cuba) — Ley 113'
    _order = 'tax_type, limit_from'

    name = fields.Char(
        string='Descripción del Tramo',
        required=True,
        translate=True,
        help='Ej: Tramo 2 — De 10.001 a 20.000 CUP/año',
    )
    tax_type = fields.Selection(
        selection=[('is_income', 'IS — Impuesto sobre los Ingresos (TCP/MIPYME)')],
        string='Tipo de Impuesto',
        required=True,
        default='is_income',
    )
    limit_from = fields.Float(
        string='Desde (CUP/año)',
        required=True,
        default=0.0,
        digits=(16, 2),
        help='Límite inferior del tramo en pesos cubanos (CUP) anuales.',
    )
    limit_to = fields.Float(
        string='Hasta (CUP/año)',
        default=0.0,
        digits=(16, 2),
        help='Límite superior en CUP anuales. Use 0 para indicar "sin límite superior".',
    )
    rate = fields.Float(
        string='Tasa (%)',
        required=True,
        digits=(5, 2),
        help='Porcentaje IS aplicable a la porción de ingreso en este tramo.',
    )
    active = fields.Boolean(string='Activo', default=True)
    note = fields.Char(
        string='Referencia Normativa',
        help='Decreto, artículo o resolución que establece este tramo.',
    )

    _sql_constraints = [
        ('limit_from_check', 'CHECK(limit_from >= 0)',
         'El límite inferior del tramo no puede ser negativo.'),
        ('rate_range_check', 'CHECK(rate >= 0 AND rate <= 100)',
         'La tasa debe estar entre 0 % y 100 %.'),
    ]
