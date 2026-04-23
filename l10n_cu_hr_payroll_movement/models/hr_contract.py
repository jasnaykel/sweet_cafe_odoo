# -*- coding: utf-8 -*-
from odoo import fields, models, api,_
from datetime import timedelta
from odoo.exceptions import ValidationError
class HrContract(models.Model):
    _inherit = 'hr.version'

    payroll_movement_ids = fields.One2many('payroll.movement', 'contract_id',
                                           string='Payroll Movement')
    movements_count = fields.Integer(compute='_compute_movements_count',
                                     string='Contract Count')

    movements_count_change = fields.Integer(compute='_compute_movements_count',
                                            string='Contract Count Change')

    @api.depends('payroll_movement_ids')
    def _compute_movements_count(self):
        for contract in self:
            contract.movements_count = len(contract.payroll_movement_ids)
            contract.movements_count_change = len(contract.payroll_movement_ids.filtered(lambda m:m.movement_type == 'change'))

    def create(self, vals):
        contract = super(HrContract, self).create(vals)
        contract._create_payroll_movement()
        return contract

    def _create_payroll_movement(self, movement_type='high'):
        for contract in self:
            if not contract.employee_id:
                continue
            details_movement_type = \
                self.env['details.movement.type'].search([('movement_type', '=', movement_type)])
            self.env['payroll.movement'].create({
                'is_initial_movement': True,
                'employee_id': contract.employee_id and contract.employee_id.id,
                'contract_id': contract.id,
                'actual_wage': contract.wage,
                'actual_situation_id': contract.job_id and contract.job_id.id,
                'details_movement_type_id': details_movement_type and details_movement_type[0].id,
                'actual_occupational_category_id': contract.occupational_category_id
                and contract.occupational_category_id.id,
                'actual_department_id':contract.department_id and contract.department_id.id,
                'actual_resource_calendar_id': contract.resource_calendar_id
                and contract.resource_calendar_id.id,
            })

    def action_open_movement_list(self):
        self.ensure_one()
        action = self.env["ir.actions.actions"]._for_xml_id('l10n_cu_hr_payroll_movement.action_hr_payroll')
        action.update({'domain': [('contract_id', '=', self.id)],
                      'views':  [[False, 'list'], [False, 'kanban'], [False, 'activity'], [False, 'form']],
                       'context': {'default_contract_id': self.id}})
        return action










