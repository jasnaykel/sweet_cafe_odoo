# -*- coding: utf-8 -*-
from odoo import fields, models, api, _
from odoo.exceptions import ValidationError, UserError
from datetime import timedelta, date
from dateutil.relativedelta import relativedelta


class HrVersion(models.Model):
    """Extends hr.version (Odoo 19 contract) with Cuban employment law fields."""
    _inherit = 'hr.version'

    name = fields.Char(
        string='Contract Reference', required=True,
        default=lambda self: _('New'), readonly=True,
    )
    contract_state = fields.Selection([
        ('draft', 'New'), ('open', 'Running'), ('close', 'Expired'),
    ], string='Status', group_expand='_expand_contract_states', copy=False,
       tracking=True, help='Status of the contract', default='draft')

    contract_type = fields.Selection(
        [('indeterminado', 'Indeterminado'), ('determinado', 'Determinado')],
        default='indeterminado', string='Contract Type',
    )
    determined_contract_type_id = fields.Many2one(
        'determined.contract.type', string='Determined Contract Type', ondelete='restrict',
    )
    number_of_days = fields.Integer(string='Number of days', default=0)
    occupational_category_id = fields.Many2one(
        'occupational.category', string='Occupational Category',
        compute='_compute_job', ondelete='restrict', store=True,
    )
    skip_compute_date_end = fields.Boolean(string='Skip Compute', default=False)

    def unlink(self):
        for contract in self:
            if contract.contract_state == 'open':
                raise UserError(_('No se puede eliminar un contrato confirmado.'))
        return super().unlink()

    @api.constrains('contract_state')
    def _check_state(self):
        for record in self:
            open_contracts = self.search([
                ('contract_state', '=', 'open'),
                ('company_id', '=', record.company_id.id),
                ('employee_id', '=', record.employee_id.id),
                ('id', '!=', record.id),
            ])
            if open_contracts and record.contract_state == 'open':
                raise ValidationError(_('Solo puede haber un contrato aprobado para este empleado.'))
            overlapping_contracts = self.search([
                ('company_id', '=', record.company_id.id),
                ('employee_id', '=', record.employee_id.id),
                ('id', '!=', record.id),
                ('contract_state', '!=', 'close'),
                ('contract_date_start', '=', record.contract_date_start),
            ])
            if overlapping_contracts:
                raise ValidationError(
                    _('Las fechas de inicio no pueden solaparse con otros contratos activos del empleado.')
                )

    @api.onchange('department_id')
    def _onchange_department(self):
        for record in self:
            record.job_id = False

    @api.depends('job_id')
    def _compute_job(self):
        for record in self.filtered('job_id'):
            if record.job_id.wage and not record.wage:
                record.wage = record.job_id.wage
            record.occupational_category_id = record.job_id.occupational_category_id

    @api.constrains('wage', 'contract_state')
    def _check_wage(self):
        for record in self:
            if record.contract_state == 'open' and record.wage <= 0.00:
                raise ValidationError(_("The basic salary must be greater than 0.00."))

    @api.model
    def _expand_contract_states(self, states, domain, order):
        return [key for key, val in type(self).contract_state.selection]

    @api.depends('contract_date_start', 'number_of_days', 'contract_type')
    def _compute_end_date(self):
        for record in self:
            if record.contract_date_start and record.number_of_days:
                if record.contract_type == 'determinado' and record.contract_state == 'draft':
                    start_date = fields.Date.from_string(record.contract_date_start)
                    record.contract_date_end = start_date + timedelta(days=record.number_of_days - 1)
                elif record.contract_type == 'indeterminado' and record.contract_state == 'draft':
                    if not record.skip_compute_date_end:
                        record.contract_date_end = False
                    record.determined_contract_type_id = False
                    record.number_of_days = 0
            else:
                if not record.skip_compute_date_end:
                    record.contract_date_end = False

    @api.model
    def get_sequence_prefix(self, designation):
        return 'DESIG' if designation else 'CONT'

    @api.model
    def get_sequence_suffix(self, contract_type, designation):
        return ('IND' if contract_type == 'indeterminado' else 'DET') if not designation else ''

    def _prepare_contract_name(self, vals, record=None):
        sequence_obj = self.env['ir.sequence']
        sequence = sequence_obj.next_by_code('hr.version') or _('New')
        contract_type = vals.get('contract_type') or (record and record.contract_type)
        job_id = vals.get('job_id') or (record and record.job_id and record.job_id.id)
        job = self.env['hr.job'].browse(job_id) if job_id else False
        designation = job.designation if job else False
        prefix = self.get_sequence_prefix(designation)
        suffix = self.get_sequence_suffix(contract_type, designation)
        if record and record.name:
            new_sequence = record.name.split('/')
            if len(new_sequence) > 2:
                sequence = prefix + '/' + '/'.join(new_sequence[1:-1]) + '/' + suffix
                current_next = sequence_obj.search([('code', '=', 'hr.version')], limit=1)
                next_number = current_next and int(current_next.number_next_actual) - 1
                sequence_obj.write({'number_next_actual': next_number})
        return str(sequence).replace('CONTRACT_PREFIX', prefix).replace('SUFFIX_VALUE', suffix)

    def write(self, vals):
        res = super().write(vals)
        today = fields.Date.today()
        if vals.get('contract_state') == 'open':
            # When opening a contract, close any other open ones for same employee
            for contract in self:
                other_open = self.search([
                    ('employee_id', '=', contract.employee_id.id),
                    ('company_id', '=', contract.company_id.id),
                    ('contract_state', '=', 'open'),
                    ('id', '!=', contract.id),
                ])
                other_open.write({'contract_state': 'close'})
        if vals.get('contract_state') == 'close':
            for contract in self.filtered(lambda c: not c.contract_date_end):
                contract.contract_date_end = max(today, contract.contract_date_start or today)
        return res

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('New')) == _('New'):
                vals['name'] = self._prepare_contract_name(vals)
            if 'wage' not in vals:
                job = self.env['hr.job'].browse(vals.get('job_id'))
                vals['wage'] = job.wage if job else 0
        return super().create(vals_list)

    def print_contract_proforma(self):
        return self.env.ref(
            'l10n_cu_hr_employee_contract.action_report_contract_proforma'
        ).report_action(self)

    def print_supplier_contract(self):
        return self.env.ref(
            'l10n_cu_hr_employee_contract.action_report_contract_supplier'
        ).report_action(self)

    @api.model
    def print_expiring_contracts_report(self):
        company = self.env.company
        notice_days = getattr(company, 'contract_expiration_notice_period', 30)
        contracts = self.search([
            ('contract_state', '=', 'open'),
            ('contract_date_end', '!=', False),
            ('contract_date_end', '>=', fields.Date.today()),
            ('contract_date_end', '<=', fields.Date.today() + relativedelta(days=notice_days)),
        ])
        for contract in contracts:
            contract.with_context(mail_activity_quick_update=True).activity_schedule(
                'mail.mail_activity_data_todo', contract.contract_date_end,
                _("The contract of %s is about to expire.", contract.employee_id.name),
                user_id=contract.hr_responsible_id.id or self.env.uid,
            )


