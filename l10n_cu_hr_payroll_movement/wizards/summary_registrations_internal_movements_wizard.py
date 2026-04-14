from odoo.exceptions import ValidationError

from odoo import models, fields, api, _


class SummaryRegistrationsInternalMovementsWizard(models.TransientModel):
    _name = 'report.resumen.wizard'
    _description = 'Summary of registrations and internal movements Wizard'

    company_id = fields.Many2one('res.company', 'Company')
    date_from = fields.Date(string='Date From')
    date_to = fields.Date(string='Date To')

    @api.constrains('date_from', 'date_to')
    def _check_dates(self):
        for record in self:
            if record.date_from and record.date_to:
                if record.date_from > record.date_to:
                    raise ValidationError(_("The start date cannot be later than the end date"))
                elif record.date_to < record.date_from:
                    raise ValidationError(_("The end date cannot be earlier than the start date"))

    def generate_report(self):
        self.ensure_one()
        domain = [('state', '=', 'open')]

        if self.date_from:
            domain.append(('effective_date', '>=', self.date_from))
        if self.date_to:
            domain.append(('effective_date', '<=', self.date_to))
        if self.company_id:
            domain.append(('company_id', '=', self.env.user.company_id.id))

        movements = self.env['payroll.movement'].search(domain)
        movements = movements.filtered(lambda m: m.state == 'open')
        if not movements:
            raise ValidationError(_("No items were found that match the search criteria"))

        data = self._prepare_report_data(movements)

        return self.env.ref('l10n_cu_hr_payroll_movement.'
                            'action_report_summary_registrations_internal_movements').report_action(self, data=data)

    def _prepare_report_data(self, movements):
        company_data = {}
        for movement in movements:
            company_id = movement.company_id.id
            movement_type = movement.movement_type

            if company_id not in company_data:
                company_data[company_id] = {
                    'company_name': movement.company_id.name,
                    'altas': 0,
                    'cambios': 0,
                }

            if movement_type == 'high':
                company_data[company_id]['altas'] += 1
            elif movement_type == 'change':
                company_data[company_id]['cambios'] += 1

        return {
            'company_data': list(company_data.values()),
        }
