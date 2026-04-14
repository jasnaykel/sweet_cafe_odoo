from odoo import models, fields

class ResMunicipality(models.Model):
    _name = 'res.municipality'
    _description = 'Cuban Municipality'
    _order = 'name'

    name = fields.Char(string='Name', required=True, translate=True)
    code = fields.Char(string='Code', required=True)
    state_id = fields.Many2one('res.country.state', string='Province', required=True, domain="[('country_id.code', '=', 'CU')]")
    active = fields.Boolean(default=True)
