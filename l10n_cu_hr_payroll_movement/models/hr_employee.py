# -*- coding: utf-8 -*-
from odoo import fields, models, api
from odoo.exceptions import ValidationError

class HrEmployee(models.Model):
    _inherit = 'hr.employee'

    movements_count = fields.Integer(compute='_compute_movements_count', string='Contract Count')

    def _compute_movements_count(self):
        for employee in self:
            employee.movements_count = self.env['payroll.movement'].search_count([('employee_id', '=', employee.id)])

    def action_open_movement_list(self):
        self.ensure_one()
        action = self.env["ir.actions.actions"]._for_xml_id('l10n_cu_hr_payroll_movement.action_hr_payroll')
        action.update({'domain': [('employee_id', '=', self.id)],
                      'views':  [[False, 'list'], [False, 'kanban'], [False, 'activity'], [False, 'form']],
                       'context': {'default_employee_id': self.id}})
        return action
