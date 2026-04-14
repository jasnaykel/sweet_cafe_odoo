from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
from datetime import datetime
class ContractingBehaviorWizard(models.TransientModel):
    _name = 'report.contracting.behavior.wizard'
    _description = 'Contracting Behavior Report Wizard'
    
    company_id = fields.Many2one('res.company', 'Company')
    date_from = fields.Date(string='Date From', required=True)
    date_to = fields.Date(string='Date To', required=True)

    def generate_xlsx_report(self):
        self.ensure_one()
        """
        The 'generate_report' function searches for employees with 'determinate' type and 'open' state contracts.
        If no specific date range, company, or bank is selected, it generates a report for all employees matching these criteria.
        If specific criteria are selected, it applies these in the search. If it finds employees matching these criteria, it generates a report.
        """
        domain = [
        '|',
        '&',
        ('movement_type', '=', 'high'),
        ('state', '=', 'open'),
        '&', ('movement_type', '=', 'low'),
        ('state', '=', 'open')
    ]
        if self.date_from:
            domain.append(('effective_date', '>=', self.date_from))
        if self.date_to:
            domain.append(('effective_date', '<=', self.date_to))
        if self.company_id:
            domain.append(('company_id', '=', self.env.user.company_id.id))

        movement = self.env['payroll.movement'].search(domain)
        if not movement:
         raise ValidationError(_("No items were found that match the search criteria"))
        data = self._prepare_report_data(movement)
        data['date_from'] = fields.Date.to_string(self.date_from)
        data['date_to'] = fields.Date.to_string(self.date_to)
        return self.env.ref('l10n_cu_hr_payroll_movement.action_report_contracting_behavior').report_action(self, data=data)
        
    @api.constrains('date_from', 'date_to')
    def _check_dates(self):
        """Checks that the start date is not later than the end date and vice versa."""
        for record in self:
            if record.date_from and record.date_to:
                if record.date_from > record.date_to:
                    raise ValidationError(_("The start date cannot be later than the end date"))
                elif record.date_to < record.date_from:
                    raise ValidationError(_("The end date cannot be earlier than the start date"))

    def _prepare_report_data(self, movements):
        """Prepare the data for the report. 
        Group the movements by company and calculate the totals of highs and lows per month."""
        company_data_zedm = {}
        company_data_other = {}
        for movement in movements:
            company_id = movement.company_id.id
            movement_type = movement.movement_type
            month = movement.date.month

            if movement.company_id:
                company_data = company_data_other

            if company_id not in company_data:
                company_data[company_id] = {
                    'company_name': movement.company_id.name,
                    'altas': [0]*12,  # Una entrada para cada mes
                    'bajas': [0]*12, 
                }
            if movement_type == 'high':
                company_data[company_id]['altas'][month-1] += 1
            elif movement_type == 'low':
                company_data[company_id]['bajas'][month-1] += 1

        return {

            'company_data': list(company_data_other.values()),
        }
