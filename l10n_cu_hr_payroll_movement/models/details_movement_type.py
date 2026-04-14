# -*- coding: utf-8 -*-
from odoo import fields, models, api,_
from odoo.exceptions import ValidationError


class DetailsMovementType(models.Model):
    _name = 'details.movement.type'
    _description = 'Details Movement Type'

    name = fields.Char(string="Name", groups="hr.group_hr_user", required=True)
    movement_type = fields.Selection([('high', 'High'), ('low', 'Low'), ('change', 'Change')], 'Classification',
                                     required=True,
                                     default='high',
                                     store=True)
    company_id = fields.Many2one('res.company', string='Company', default=lambda self: self.env.company)

    reasons_movement_type_ids = fields.Many2many(
        'reasons.movement.type',
        'reasons_details_rel',
        'details_movement_type_id',
        'reasons_movement_type_id',
        string='Reasons',check_company=True,
    )


    @api.ondelete(at_uninstall=False)
    def _unlink_except_referenced_by_movemet(self):
        employees = self.env['payroll.movement'].search([('details_movement_type_id', 'in', self.ids)])
        if employees:
            raise ValidationError(
                    _("No puedes eliminar un tipo de movimiento de nómina que está siendo utilizado por Movimientos de Nómina."))

    @api.constrains('name')
    def _check_name(self):
        '''
        Valida que el name sea único, sin distinguir mayúsculas y minúsculas
        '''
        if len(self.search([('name', '=ilike', self.name),
                            ('company_id', '=', self.company_id.id),
                            ('id', 'not in', self.ids)])):
            raise ValidationError(u'El nombre del movimiento de nómina debe '
                                  u'ser único.')

    @api.constrains('movement_type')
    def _check_classification(self):
        '''
        Valida que el movement_type sean únicos
        '''
        if len(self.search([('movement_type', '=', 'high'),
                            ('company_id', '=', self.company_id.id),
                            ('id', 'not in', self.ids)])) and self.movement_type == 'high':
            raise ValidationError(u'Solo puede haber un tipo movimiento de nómina de alta.')

        if len(self.search([('movement_type', '=', 'low'),
                            ('company_id', '=', self.company_id.id),
                            ('id', 'not in', self.ids)])) and self.movement_type == 'low':
            raise ValidationError(u'Solo puede haber un tipo movimiento de nómina de baja.')
