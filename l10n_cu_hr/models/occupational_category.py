# -*- coding: utf-8 -*-
from odoo import fields, models, api,_
from odoo.exceptions import ValidationError


class OccupationalCategory(models.Model):
    _name = 'occupational.category'
    _description = 'Occupational Category'

    code = fields.Char(string="Code", groups="hr.group_hr_user", required=True)
    name = fields.Char(string="Name", groups="hr.group_hr_user", required=True)
    company_id = fields.Many2one('res.company', string='Company', default=lambda self: self.env.company)


    @api.ondelete(at_uninstall=False)
    def _unlink_except_referenced_by_employee(self):
        employees = self.env['hr.employee'].search([('occupational_category_id', 'in', self.ids)])
        if employees:
            raise ValidationError(
                    _("No puedes eliminar una categoría ocupacional que está siendo utilizado por empleados."))



    @api.constrains('name', 'code')
    def _check_name_code(self):
        '''
        Valida que el name y code sean únicos
        '''
        if len(self.search([('name', '=ilike', self.name),
                            ('code', '=ilike', self.code),
                            ('company_id', '=', self.company_id.id),
                            ('id', 'not in', self.ids)])):
            raise ValidationError(u'El nombre y el código de la categoría ocupacional deben '
                                  u'ser único.')