from odoo import models, fields, api, _
from odoo.exceptions import ValidationError,UserError
from collections import defaultdict

class PayrollMovement(models.Model):
    _name = "payroll.movement"
    _description = 'Payroll Movement'

    name = fields.Char(string="Name", default=lambda self: _("Movement"))
    company_id = fields.Many2one('res.company', string='Company', default=lambda self: self.env.company)
    employee_id = fields.Many2one('hr.employee', string='Employee', required=True,check_company=True)
    contract_id = fields.Many2one('hr.version', 'Contract Reference', required=True,
                                         domain="[('employee_id', '=', employee_id),('contract_state', '!=', 'close')]",ondelete='cascade')
    state = fields.Selection([('draft', 'New'), ('open', 'Open')], 'State', required=True, default='draft',
                             store=True)
    effective_date = fields.Date('Effective Date')
    date = fields.Date('Date', default=fields.Date.today())

    # Actual situation
    actual_wage = fields.Float(string='Basic Salary',store=True,
                               compute="_compute_all_fields")
    actual_situation_id = fields.Many2one('hr.job', string='Job Name', store=True,
                                          check_company=True, compute="_compute_all_fields")
    actual_occupational_category_id = fields.Many2one('occupational.category',
                                                   string='Occupational Category',
                                                   store=True,
                                                      compute="_compute_all_fields")
    actual_department_id = fields.Many2one('hr.department', 'Work Area',
                                           related='actual_situation_id.department_id',
                                           store=True, compute="_compute_all_fields")
    actual_resource_calendar_id = fields.Many2one('resource.calendar',string="Working Hours", store=True,
                                                  default=lambda self: self.env.company.resource_calendar_id.id,
                                                  check_company=True, compute="_compute_all_fields")

    # New situation
    new_wage = fields.Float(string='New Salary', store=True, compute="_compute_all_fields")
    new_situation_id = fields.Many2one('hr.job', 'New Job',check_company=True,
                                       store=True, compute="_compute_all_fields")
    new_occupational_category_id = fields.Many2one('occupational.category',
                                                   string='New Occupational Category', store=True,
                                                   compute="_compute_all_fields")
    new_department_id = fields.Many2one('hr.department', 'New Work Area',
                                        related='new_situation_id.department_id',
                                        store=True,compute="_compute_all_fields")

    new_resource_calendar_id = fields.Many2one('resource.calendar',string="New Working Hours", store=True,
                                               default=lambda self: self.env.company.resource_calendar_id.id,
                                               check_company=True, compute="_compute_all_fields")
    details_movement_type_id = fields.Many2one('details.movement.type', string='Movement Type',
                                               required=True)
    reasons_movement_type_id = fields.Many2one('reasons.details.rel', string='Reasons Movement Type',ondelete='set null',
                                               domain="[('details_movement_type_id', '=', details_movement_type_id)]")
    movement_type = fields.Selection('Movement Type',
                                     related='details_movement_type_id.movement_type',
                                     store=True)
    is_initial_movement = fields.Boolean(string='Initial Movement', default=False)

    def _compute_display_name(self):
        for record in self:
            record.display_name = 'MOV' + '-' + (record.contract_id.name or '')

    @api.constrains('movement_type')
    def _check_movement(self):
        '''
        Valida que el movement_type sean únicos
        '''
        if len(self.search([('movement_type', '=', 'high'),
                            ('company_id', '=', self.company_id.id),
                            ('employee_id', '=', self.employee_id.id),
                            ('contract_id', '=', self.contract_id.id),
                            ('id', 'not in', self.ids)])) and self.movement_type == 'high' \
                and self.contract_id.contract_state != 'close':
            raise ValidationError(u'Solo puede haber un movimiento de nómina de alta para este empleado.')

        if len(self.search([('movement_type', '=', 'low'),
                            ('company_id', '=', self.company_id.id),
                            ('employee_id', '=', self.employee_id.id),
                            ('contract_id', '=', self.contract_id.id),
                            ('id', 'not in', self.ids)])) and self.movement_type == 'low':
            raise ValidationError(u'Solo puede haber un movimiento de nómina de baja para este empleado.')

    @api.ondelete(at_uninstall=False)
    def _check_type_usage(self):
        for record in self:
            if record.state == 'open':
                raise ValidationError(_('The payroll movement has already been approved, it cannot be deleted.'))

    def action_approve(self):
        for record in self:
            record.state = 'open'
            # record.effective_date = fields.Date.today()
            record.update_contract()

    @api.depends('contract_id', 'movement_type', 'details_movement_type_id')
    def _compute_all_fields(self):
        for record in self:
            try:
                if record.movement_type in ['change', 'low']:
                    if record.contract_id:
                        self._set_actual_fields(record)
                        self._set_new_fields(record)
                    else:
                        self._reset_fields(record)
                else:
                    fields_to_reset = ['new_wage','new_department_id','new_occupational_category_id',
                                       'new_resource_calendar_id']
                    self._set_fields(record, {field: False for field in fields_to_reset})

            except Exception as e:
                self._handle_computation_error(e)

    @api.onchange('new_situation_id')
    def _onchange_new_job(self):
        for record in self:
            try:
                if record.new_situation_id and record.movement_type in ['change', 'low']:
                    job = record.new_situation_id
                    new_fields = {
                        'new_department_id': job.department_id.id,
                        'new_occupational_category_id': job.occupational_category_id.id,
                        'new_wage': job.wage
                    }
                    self._set_fields(record, new_fields)

            except Exception as e:
                self._handle_computation_error(e)

    @api.onchange('actual_situation_id')
    def _onchange_actual_job(self):
        for record in self:
            try:
                if record.actual_situation_id:
                    job = record.actual_situation_id
                    new_fields = {
                        'actual_department_id': job.department_id.id,
                        'actual_occupational_category_id': job.occupational_category_id.id,
                        'actual_wage': job.wage
                    }
                    self._set_fields(record, new_fields)
            except Exception as e:
                self._handle_computation_error(e)

    def _set_actual_fields(self, record):
        if not record.is_initial_movement:
            actual_fields = {
                'actual_wage': record.contract_id.wage,
                'actual_situation_id': record.contract_id.job_id.id,
                'actual_occupational_category_id': record.contract_id.occupational_category_id.id,
                'actual_department_id': record.contract_id.department_id.id,
                'actual_resource_calendar_id': record.contract_id.resource_calendar_id.id,
            }
            self._set_fields(record, actual_fields)

    def _set_new_fields(self, record):
        if record.movement_type in ['high', 'low']:
            new_fields = defaultdict(lambda: False)
            new_fields['new_wage'] = 0.0
        else:
            job = record.contract_id.job_id
            new_fields = {}
            # if not record.new_situation_id:
            #     new_fields['new_situation_id'] = job.id
            # if not record.new_occupational_category_id:
            #     new_fields['new_occupational_category_id'] = job.occupational_category_id.id
            # if not record.new_department_id:
            #     new_fields['new_department_id'] = job.department_id.id
            if not record.new_resource_calendar_id:
                new_fields['new_resource_calendar_id'] = record.contract_id.resource_calendar_id.id
            # if not record.new_wage or record.new_wage <= 0:
            #     new_fields['new_wage'] = job.wage
        self._set_fields(record, new_fields)

    def _reset_fields(self, record):
        fields_to_reset = [
            'actual_wage', 'actual_situation_id', 'actual_occupational_category_id',
            'actual_department_id', 'actual_resource_calendar_id',
            'new_wage', 'new_situation_id', 'new_occupational_category_id',
            'new_department_id', 'new_resource_calendar_id'
        ]
        reset_values = {field: False for field in fields_to_reset}
        reset_values.update({'actual_wage': 0.0, 'new_wage': 0.0})
        self._set_fields(record, reset_values)

    def _set_fields(self, record, values):
        for field, value in values.items():
            setattr(record, field, value)

    def _handle_computation_error(self, error):
        self.env.logger.error(f"Error computing fields: {str(error)}")
        raise UserError(_("Error computing fields. Please check the logs or contact your administrator."))

    def update_contract(self):
        for record in self:
            if record.contract_id:
                contract_state = 'open'
                effective_date = record.effective_date
                values_to_update = {}
                if record.movement_type == 'high':
                    values_to_update = {
                        'wage': record.actual_wage,
                        'job_id': record.actual_situation_id.id,
                        'occupational_category_id': record.actual_occupational_category_id.id,
                        'department_id': record.actual_department_id.id,
                        'resource_calendar_id': record.actual_resource_calendar_id.id,
                        'date_start': effective_date,
                    }
                elif record.movement_type == 'change':
                    values_to_update = {
                        'wage': record.new_wage,
                        'job_id': record.new_situation_id.id,
                        'occupational_category_id': record.new_occupational_category_id.id,
                        'department_id': record.new_department_id.id,
                        'resource_calendar_id': record.new_resource_calendar_id.id,
                        'date_start': effective_date,
                    }
                elif record.movement_type == 'low':
                    contract_state = 'close'
                    values_to_update = {'date_end': effective_date, 'skip_compute_date_end': True}
                if values_to_update:
                    values_to_update.update({'contract_state': contract_state})
                    record.contract_id.write(values_to_update)
                    if record.movement_type in ['high', 'change']:
                        employee_vals = {k: v for k, v in values_to_update.items()
                                         if k not in ('contract_state', 'date_start', 'name')}
                        if record.contract_id.employee_id:
                            record.contract_id.employee_id.write(employee_vals)

    def print_approve_movement(self):
        return self.env.ref('l10n_cu_hr_payroll_movement.action_report_payroll_movement').report_action(self)

    def update_contract(self):
        for record in self:
            if record.contract_id:
                contract_state = 'open'
                effective_date = record.effective_date
                values_to_update = {}
                if record.movement_type == 'high':
                    values_to_update = {
                        'wage': record.actual_wage,
                        'job_id': record.actual_situation_id.id,
                        'occupational_category_id': record.actual_occupational_category_id.id,
                        'department_id': record.actual_department_id.id,
                        'resource_calendar_id': record.actual_resource_calendar_id.id,
                        'date_start': effective_date
                }
                elif record.movement_type == 'change':
                    values_to_update = {
                        'wage': record.new_wage,
                        'job_id': record.new_situation_id.id,
                        'occupational_category_id': record.new_occupational_category_id.id,
                        'department_id': record.new_department_id.id,
                        'resource_calendar_id': record.new_resource_calendar_id.id,
                        'date_start': effective_date
                    }
                elif record.movement_type == 'low':
                    contract_state = 'close'
                    values_to_update = {
                        'date_end': effective_date,
                        'skip_compute_date_end':True
                    }
                if values_to_update:
                    values_to_update.update({'contract_state': contract_state})
                    record.contract_id.write(values_to_update)
                    if record.movement_type in ['high', 'change']:
                        if values_to_update.get('contract_state'):
                            del values_to_update['contract_state']
                        if values_to_update.get('date_start'):
                            del values_to_update['date_start']
                        if values_to_update.get('name'):
                            del values_to_update['name']
                        if record.contract_id.employee_id:
                            self.env['hr.employee'].browse(record.contract_id.employee_id.id).write(values_to_update)

    def print_approve_movement(self):
        return self.env.ref('l10n_cu_hr_payroll_movement.action_report_payroll_movement').report_action(self)


