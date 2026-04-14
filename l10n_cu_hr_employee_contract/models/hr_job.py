# -*- coding: utf-8 -*-
from odoo import fields, models, api, _
from odoo.exceptions import ValidationError


class Hrjob(models.Model):
    _inherit = 'hr.job'

    designation = fields.Boolean(string='Designation')
    occupational_category_id = fields.Many2one(
        'occupational.category', string='Occupational Category',
        ondelete='restrict', check_company=True, store=True,
    )
    currency_id = fields.Many2one(
        string="Currency", related='company_id.currency_id', readonly=True,
    )
    wage = fields.Monetary(
        'Wage', required=True, tracking=True,
        help="Employee's monthly gross wage.", group_operator="avg",
    )

    @api.constrains('name', 'department_id')
    def _check_name_code(self):
        for record in self:
            if len(self.search([
                ('name', '=', record.name),
                ('department_id', '=', record.department_id.id),
                ('company_id', '=', record.company_id.id),
                ('id', 'not in', record.ids),
            ])):
                raise ValidationError(_('El puesto de trabajo debe ser único por departamento.'))

    @api.constrains('wage')
    def _check_wage(self):
        for record in self:
            if record.wage <= 0.00:
                raise ValidationError(_("The basic salary must be greater than 0.00."))
