# -*- coding: utf-8 -*-
from odoo import fields, models


class ResCompany(models.Model):
    _inherit = 'res.company'

    report_template_id = fields.Many2one(
        'ir.actions.report', string='Proforma',
        help="For personal determinate contract",
    )
    res_municipality_id = fields.Many2one(
        'res.municipality', 'Municipio',
        domain="[('state_id', '=', state_id)]",
        help="Municipios de Cuba",
    )
