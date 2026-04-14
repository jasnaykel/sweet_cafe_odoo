# -*- coding: utf-8 -*-
from odoo import fields, models, api, _
from odoo.exceptions import ValidationError


class HrEmployee(models.Model):
    _inherit = 'hr.employee'

    occupational_category_id = fields.Many2one(
        'occupational.category', string='Occupational Category',
        compute='_compute_job', ondelete='restrict', store=True,
    )
    currency_id = fields.Many2one(
        string="Currency", related='company_id.currency_id', readonly=True,
    )
    wage = fields.Monetary(
        'Wage', tracking=True, default=0.0,
        compute='_compute_job',
        help="Employee's monthly gross wage.", group_operator="avg", store=True,
    )

    @api.depends('job_id')
    def _compute_job(self):
        for record in self.filtered('job_id'):
            if record.job_id:
                record.wage = record.job_id.wage
                record.occupational_category_id = record.job_id.occupational_category_id

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if 'resource_id' not in vals:
                resource = self.env['resource.resource'].create({
                    'name': vals.get('name', 'Nuevo Recurso'),
                    'resource_type': 'user',
                    'time_efficiency': 100,
                    'calendar_id': self.env.ref('resource.resource_calendar_std').id,
                })
                vals['resource_id'] = resource.id
            if 'wage' not in vals:
                job = self.env['hr.job'].browse(vals.get('job_id'))
                vals['wage'] = job.wage if job else 0
        return super().create(vals_list)
