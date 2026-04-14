# -*- coding: utf-8 -*-
from odoo import models, fields, api
from datetime import datetime


class HrEmployee(models.Model):
    _inherit = 'hr.employee'

    age = fields.Integer(string='Age', compute='_compute_age', store=True)

    @api.depends('birthday')
    def _compute_age(self):
        for employee in self:
            if employee.birthday:
                today = datetime.today()
                birth_date = fields.Date.from_string(employee.birthday)
                age = (today.year - birth_date.year
                       - ((today.month, today.day) < (birth_date.month, birth_date.day)))
                employee.age = age
            else:
                employee.age = 0
