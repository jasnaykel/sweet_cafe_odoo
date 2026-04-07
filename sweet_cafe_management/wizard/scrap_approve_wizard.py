# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.exceptions import UserError


class SweetScrapApproveWizard(models.TransientModel):
    """Wizard to approve or reject a sweet.scrap record with an optional reason."""
    _name = 'sweet.scrap.approve.wizard'
    _description = 'Asistente de Aprobación / Rechazo de Merma'

    scrap_id = fields.Many2one(
        'sweet.scrap',
        string='Merma',
        required=True,
        ondelete='cascade',
    )
    action = fields.Selection(
        selection=[
            ('approve', 'Aprobar'),
            ('reject', 'Rechazar'),
        ],
        string='Acción',
        required=True,
        default='approve',
    )
    rejection_reason = fields.Text(
        string='Motivo de Rechazo',
        help='Obligatorio al rechazar una merma',
    )
    supervisor_id = fields.Many2one(
        'hr.employee',
        string='Supervisor',
        default=lambda self: self.env.user.employee_id,
    )

    @api.constrains('action', 'rejection_reason')
    def _check_rejection_reason(self):
        for wizard in self:
            if wizard.action == 'reject' and not wizard.rejection_reason:
                raise UserError(_('Debe indicar el motivo del rechazo.'))

    def action_confirm(self):
        self.ensure_one()
        if self.action == 'approve':
            self.scrap_id.supervisor_id = self.supervisor_id
            self.scrap_id.action_approve()
        elif self.action == 'reject':
            self.scrap_id.write({
                'state': 'rejected',
                'rejection_reason': self.rejection_reason,
                'supervisor_id': self.supervisor_id.id,
            })
        return {'type': 'ir.actions.act_window_close'}
