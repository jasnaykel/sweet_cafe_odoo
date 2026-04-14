# -*- coding: utf-8 -*-
from odoo import fields, models


class HrVersion(models.Model):
    _inherit = 'hr.version'

    def print_contract_proforma(self):
        res = super().print_contract_proforma()
        if self.company_id.report_template_id and self.contract_type == 'determinado':
            return self.company_id.report_template_id.report_action(self)
        return res
