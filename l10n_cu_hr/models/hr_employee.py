# -*- coding: utf-8 -*-
from odoo import fields, models, api
from odoo.exceptions import ValidationError
import re

import logging

_logger = logging.getLogger(__name__)
class HrEmployee(models.Model):
    _inherit = 'hr.employee'
    _rec_name = 'full_name'

    company_id = fields.Many2one('res.company', readonly=True, string='Company')
    # address_id = fields.Many2one(
    #     'res.partner', 
    #     'Work Location',
    #     readonly=True,
    #     compute='_compute_address_id',
    #     domain="[('id', '=', company_id.partner_id.id)]"
    # )
    res_private_municipality_id = fields.Many2one('res.municipality', 'Private Municipality',
                                                  domain="[('state_id', '=', private_state_id)]", help="Mucipality of Cuba" )

    private_country_id = fields.Many2one("res.country",
                                         string="Private Country",
                                         groups="hr.group_hr_user",
                                         default=lambda self: self.env['res.country'].search([('code', '=', 'CU')], limit=1).id)

    personal_street = fields.Char(string="Personal Street", groups="hr.group_hr_user")
    personal_street2 = fields.Char(string="Personal Street2", groups="hr.group_hr_user")
    personal_city = fields.Char(string="Personal City", groups="hr.group_hr_user")
    personal_state_id = fields.Many2one("res.country.state", string="Personal State",
                                        domain="[('country_id', '=?', personal_country_id)]",
                                        groups="hr.group_hr_user")
    personal_zip = fields.Char(string="Personal Zip", groups="hr.group_hr_user")
    personal_country_id = fields.Many2one("res.country",
                                          string="Personal Country",
                                          groups="hr.group_hr_user",
                                          default=lambda self: self.env['res.country'].search([('code', '=', 'CU')], limit=1).id)
    personal_phone = fields.Char(string="Personal Phone", groups="hr.group_hr_user")
    personal_email = fields.Char(string="Personal Email", groups="hr.group_hr_user")
    res_personal_municipality_id = fields.Many2one('res.municipality', 'Personal Municipality',
                                              domain="[('state_id', '=', personal_state_id)]", help="Mucipality of Cuba")

    state_of_birth_id = fields.Many2one(
        "res.country.state", string="State of Birth",
        domain="[('country_id', '=?', country_of_birth)]",
        groups="hr.group_hr_user")

    municipality_of_birth_id = fields.Many2one(
        'res.municipality', string='Municipality of birth',
        domain="[('state_id', '=', state_of_birth_id)]",
        groups="hr.group_hr_user")
    last_name = fields.Char(string="First name", groups="hr.group_hr_user")
    second_last_name = fields.Char(string="Second name", groups="hr.group_hr_user")
    full_name = fields.Char(string='Full Name', compute='_compute_full_name', store=True)
    number = fields.Char(string="Number", groups="hr.group_hr_user")

    schooling_level_id = fields.Many2one('schooling.level', string='Schooling Level',
                                         ondelete='restrict')
    occupational_category_id = fields.Many2one('occupational.category',
                                               string='Occupational Category', ondelete='restrict')
    profession_id = fields.Many2one('profession', string='Profession', ondelete='restrict')

    job_id = fields.Many2one('hr.job', tracking=True,
                             domain="[('department_id', '=', department_id)]")

    identification_id = fields.Char(string='Identification No', groups="hr.group_hr_user", tracking=True)

    is_department_manager = fields.Boolean(string="Is Department Manager", compute="_compute_is_department_manager", store=True)
    managed_department_id = fields.One2many('hr.department', 'manager_id', string="Managed Department")
    available_manager_ids = fields.Many2many('hr.employee', string="Available Managers", compute="_compute_available_managers")
    skin_color = fields.Selection([
        ('white', 'White'),
        ('mixed', 'Mixed'),
        ('black', 'Black')
    ], string='Skin Color',help='Color of the skin employee', default='mixed')

    political_affiliation = fields.Selection([
        ('pcc', 'PCC'),
        ('ujc', 'UJC')
    ], string='Political Affiliation',help='Political affiliation of employee')
    
    @api.depends('company_id')
    def _compute_address_id(self):
     for record in self:
        record.address_id = record.company_id.partner_id if record.company_id else None
    @api.depends('department_id')
    def _compute_available_managers(self):
     """Calcula los gerentes disponibles basados en el departamento seleccionado"""
     for employee in self:
        manager_ids = []
        if employee.department_id:
            # Recopilar todos los departamentos relacionados
            related_departments = self.env['hr.department']
            related_departments |= employee.department_id
            
            # Añadir departamentos padre
            parent_dept = employee.department_id.parent_id
            while parent_dept:
                related_departments |= parent_dept
                parent_dept = parent_dept.parent_id
            
            # Añadir departamentos hijos
            related_departments |= employee.department_id.child_ids
            
            # Obtener solo los gerentes
            manager_ids = related_departments.mapped('manager_id').ids
        
        employee.available_manager_ids = [(6, 0, manager_ids)]
    @api.onchange('identification_id')
    def _onchange_iden(self):
        patron = r'^\d{11}$'
        if self.identification_id:
            if not re.match(patron, self.identification_id):
                return {
                    'warning': {
                        'title': 'Número de Identidad',
                        'message': '¡El formato del número de identidad debe ser de 11 dígitos',
                    }
                }
    @api.onchange('number')
    def _onchange_numb(self):
        patron = r'^\d{5}$'
        if self.number:
            if not re.match(patron, self.number):
                return {
                    'warning': {
                        'title': 'Código de Empleado',
                        'message': '¡El código del empleado debe ser de 5 dígitos',
                    }
                }

    @api.depends('name', 'last_name', 'second_last_name')
    def _compute_full_name(self):
        for record in self:
            record.full_name = f"{record.name} {record.last_name or ''} {record.second_last_name or ''}".strip()
    #
    # @api.onchange('job_id')
    # def _onchange_job(self):
    #     for record in self:
    #         record.department_id = record.job_id.department_id
    
    @api.depends('managed_department_id')
    def _compute_is_department_manager(self):
      for employee in self:
        employee.is_department_manager = bool(employee.managed_department_id)
    @api.onchange('department_id')
    def _onchange_department(self):
     for record in self:
        record.job_id = False
    
     if not self.department_id:
        return {'domain': {'parent_id': []}}
    
     # Recopilar todos los departamentos relacionados
     department_ids = []
     department_ids.append(self.department_id.id)
    
    # Añadir departamentos padre
     parent_dept = self.department_id.parent_id
     while parent_dept:
        department_ids.append(parent_dept.id)
        parent_dept = parent_dept.parent_id
    
    # Añadir departamentos hijos
     for child in self.department_id.child_ids:
        department_ids.append(child.id)
    
    # Usar el nuevo campo is_department_manager para filtrar
     return {'domain': {
        'parent_id': [
            ('is_department_manager', '=', True),
            ('managed_department_id', 'in', department_ids)
        ]
     }}
    @api.model
    def search_panel_select_range(self, field_name, **kwargs):
     """Sobrescribe el método para filtrar departamentos por compañía en el panel de búsqueda"""
     result = super().search_panel_select_range(field_name, **kwargs)
    
     if field_name == 'department_id':
        category_domain = kwargs.get('category_domain', [])
        company_filter = None
        for item in category_domain:
            if isinstance(item, (list, tuple)) and item[0] == 'company_id' and item[1] in ('=', 'child_of'):
                company_filter = item[2]
                break
        
        if company_filter and 'values' in result:
            departments = self.env['hr.department'].search([('company_id', '=', company_filter)])
            department_ids = departments.ids
            
            if isinstance(result['values'], list):
                filtered_values = []
                for dept_info in result['values']:
                    if dept_info.get('id') in department_ids:
                        filtered_values.append(dept_info)
                
                result['values'] = filtered_values
            elif isinstance(result['values'], dict):

                filtered_values = {}
                for dept_id, dept_info in result['values'].items():
                    if int(dept_id) in department_ids:
                        filtered_values[dept_id] = dept_info
                
                result['values'] = filtered_values
    
     return result