
from odoo import fields, models, api

class WorkLocation(models.Model):
 _inherit ='hr.work.location'
 
 
 company_id = fields.Many2one('res.company', readonly=True, string='Company', default=lambda self: self.env.company)
#  address_id= fields.Many2one(
#         'res.partner', 
#         'Work Location',
#         readonly=True,
#         compute='_compute_address_id',
#         store=True,
#         force_save=True,
#         context={'show_address': 1},
#         options={'always_reload': True}
#     )
 @api.depends('company_id')
 def _compute_address_id(self):
     for record in self:
        record.address_id = record.company_id.partner_id if record.company_id else None
    