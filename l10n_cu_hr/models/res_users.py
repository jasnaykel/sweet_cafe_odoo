# -*- coding: utf-8 -*-
from odoo import models, api

class ResUsers(models.Model):
    _inherit = 'res.users'

  
    @api.onchange('company_ids')
    def _onchange_company_ids(self):
        if self.company_id and self.company_ids:
            current_companies = self.company_ids.ids
            previous_companies = self._origin.company_ids.ids
            removed_company_ids = list(set(previous_companies) - set(current_companies))
            if removed_company_ids and self.company_id.id in removed_company_ids:
                self.company_id = False