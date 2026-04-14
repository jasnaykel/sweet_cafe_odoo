from odoo import models, fields

class JobInherited(models.Model):
    _inherit = "hr.job"

    company_id = fields.Many2one('res.company', string='Company', default=lambda self: self.env.company, readonly=True)
   
