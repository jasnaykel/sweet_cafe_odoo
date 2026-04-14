from odoo import models, fields


class ResCompany(models.Model):
    _inherit = 'res.company'

    central_office = fields.Char(string='Central office')
    central_office_abbreviation = fields.Char(string='Central office abbreviation')
    business_group = fields.Char(string='Business group')
    abbreviation_group = fields.Char(string='Group abbreviation')
    ministry = fields.Char(string='Ministry')
    ministry_abbreviation = fields.Char(string='Ministry abbreviation')
    legal_address = fields.Char(string='Legal address')
    director = fields.Char(string='Director')
    job_id = fields.Char(string='Job')
    resolution = fields.Char(string='Resolution')
    employer = fields.Char(string='Footer page')
