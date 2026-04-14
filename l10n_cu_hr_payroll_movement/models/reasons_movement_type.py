# -*- coding: utf-8 -*-
from odoo import fields, models, api,_
from odoo.exceptions import ValidationError


class ReasonsMovementType(models.Model):
    _name = 'reasons.movement.type'
    _description = 'Reasons Movement Type'

    name = fields.Char(string="Name", groups="hr.group_hr_user", required=True)
    company_id = fields.Many2one('res.company', string='Company', default=lambda self: self.env.company)


    @api.ondelete(at_uninstall=False)
    def _unlink_except_referenced_by_movement(self):
        employees = self.env['payroll.movement'].search([('reasons_movement_type_id', 'in', self.ids)])
        if employees:
            raise ValidationError(
                    _("No puedes eliminar un motivo de movimiento de nómina que está siendo utilizado por Movimientos de Nómina."))


    @api.constrains('name')
    def _check_name(self):
        '''
        Valida que el name y code sean únicos
        '''
        if len(self.search([('name', '=ilike', self.name),
                            ('company_id', '=', self.company_id.id),
                            ('id', 'not in', self.ids)])):
            raise ValidationError(u'El nombre del motivo de movimiento de nómina debe '
                                  u'ser único.')

class ReasonsDetailsRel(models.Model):
    _name = 'reasons.details.rel'
    _description = 'Reasons Details Rel'
    _rec_name = 'reasons_movement_type_id'

    details_movement_type_id = fields.Many2one('details.movement.type',
                                               string="Movement Type", required=True)
    reasons_movement_type_id = fields.Many2one('reasons.movement.type',
                                               string="Reasons Movement Type", required=True)

    company_id = fields.Many2one('res.company', string='Company', default=lambda self: self.env.company)


    @api.constrains('details_movement_type_id', 'reasons_movement_type_id')
    def _check_unique_name(self):
        for record in self:
            existing_records = self.search([
                ('details_movement_type_id', '=', record.details_movement_type_id.id),
                ('reasons_movement_type_id', '=', record.reasons_movement_type_id.id),
                ('id', '!=', record.id)
            ])
            if existing_records:
                raise ValidationError(f"Este motivo '{record.reasons_movement_type_id.name}' ya existe para este tipo de movimiento.")


