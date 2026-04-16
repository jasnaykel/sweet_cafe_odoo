# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.
"""
Módulo de declaración tributaria ONAT (Cuba).

Calcula y exporta la declaración de impuestos conforme a la legislación
cubana vigente para trabajadores por cuenta propia (TCP) y empresas privadas:

  • Impuesto sobre los Ingresos (IS)
  • Impuesto por Utilización de la Fuerza de Trabajo (IUFT)
  • Contribución a la Seguridad Social del empleador (CSS)
  • Impuesto sobre las Ventas (en su caso)

Los porcentajes son configurables para adaptarse a cambios normativos.
"""
import base64
import csv
import io
from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError


class SweetOnatReport(models.Model):
    """Declaración tributaria mensual para la ONAT."""
    _name = 'sweet.onat.report'
    _description = 'Declaración ONAT — Sweet Café'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'year desc, month desc'
    _rec_name = 'display_name'

    # ── Period ────────────────────────────────────
    year = fields.Integer(
        string='Año', required=True, default=lambda self: fields.Date.today().year,
    )
    month = fields.Selection([
        ('1', 'Enero'), ('2', 'Febrero'), ('3', 'Marzo'), ('4', 'Abril'),
        ('5', 'Mayo'), ('6', 'Junio'), ('7', 'Julio'), ('8', 'Agosto'),
        ('9', 'Septiembre'), ('10', 'Octubre'), ('11', 'Noviembre'), ('12', 'Diciembre'),
    ], string='Mes', required=True, default=lambda self: str(fields.Date.today().month))

    display_name = fields.Char(compute='_compute_display_name', store=True)
    state = fields.Selection([
        ('draft', 'Borrador'),
        ('computed', 'Calculada'),
        ('submitted', 'Presentada'),
    ], default='draft', tracking=True, string='Estado', copy=False)

    company_id = fields.Many2one('res.company', default=lambda self: self.env.company)
    currency_id = fields.Many2one('res.currency', related='company_id.currency_id', readonly=True)

    # ── Tax rates (configurable) ──────────────────
    use_progressive_is = fields.Boolean(
        string='Usar IS Progresivo (Tramos)',
        default=True,
        help='Si está marcado, el IS se calcula mediante la escala progresiva cubana '
             'configurada en Configuración → Tramos IS. '
             'Si no, se aplica la tasa plana definida abajo.',
    )
    income_tax_rate = fields.Float(
        string='Tasa IS Plana (%)', default=35.0,
        help='Tasa plana del Impuesto sobre los Ingresos (solo cuando IS Progresivo está desactivado).',
    )
    labor_tax_rate = fields.Float(
        string='Tasa IUFT (%)', default=5.0,
        help='Impuesto por Utilización de la Fuerza de Trabajo',
    )
    social_security_rate = fields.Float(
        string='Tasa CSS Empleador (%)', default=14.0,
        help='Contribución a la Seguridad Social (parte patronal)',
    )
    sales_tax_rate = fields.Float(
        string='Tasa IS Ventas (%)', default=0.0,
        help='Impuesto sobre las Ventas (si aplica según vector fiscal).',
    )
    territorial_tax_rate = fields.Float(
        string='Tasa Contribución Territorial (%)', default=1.5,
        help='Contribución Territorial al municipio (Ley 113, Art. 231–240).',
    )

    # ── Computed financial bases ──────────────────
    gross_income = fields.Monetary(
        string='Ingresos Brutos', help='Total facturado en el período según contabilidad',
    )
    total_wages = fields.Monetary(
        string='Salarios Pagados', help='Suma de salarios brutos pagados a empleados en el período',
    )
    total_purchases = fields.Monetary(
        string='Compras / Gastos Deducibles',
        help='Gastos deducibles reconocidos en el período',
    )

    # ── Tax calculations ──────────────────────────
    net_income = fields.Monetary(
        string='Ingresos Netos (Base IS)',
        compute='_compute_taxes', store=True,
        help='Ingresos Brutos menos Gastos Deducibles',
    )
    income_tax = fields.Monetary(
        string='Impuesto sobre Ingresos (IS)',
        compute='_compute_taxes', store=True,
    )
    labor_tax = fields.Monetary(
        string='IUFT',
        compute='_compute_taxes', store=True,
    )
    social_security = fields.Monetary(
        string='Contribución SS Empleador',
        compute='_compute_taxes', store=True,
    )
    sales_tax = fields.Monetary(
        string='Impuesto s/ Ventas',
        compute='_compute_taxes', store=True,
    )
    territorial_tax = fields.Monetary(
        string='Contribución Territorial',
        compute='_compute_taxes', store=True,
    )
    total_to_pay = fields.Monetary(
        string='Total a Pagar ONAT',
        compute='_compute_taxes', store=True,
    )

    # ── Payment info ───────────────────────────────
    payment_date = fields.Date(
        string='Fecha de Pago',
        help='Fecha en que se realizó el pago a la ONAT.',
    )
    payment_reference = fields.Char(
        string='Referencia / Nº Operación Bancaria',
        help='Número de operación bancaria o recibo de la ONAT.',
    )
    payment_amount = fields.Monetary(
        string='Monto Pagado (CUP)',
        help='Monto efectivamente pagado a la ONAT en este período.',
    )

    # ── Notes ─────────────────────────────────────
    notes = fields.Text(string='Observaciones')

    @api.depends('year', 'month')
    def _compute_display_name(self):
        months = dict(self._fields['month'].selection)
        for rec in self:
            rec.display_name = 'ONAT %s/%s' % (months.get(rec.month, rec.month), rec.year)

    @api.depends(
        'gross_income', 'total_purchases', 'total_wages',
        'use_progressive_is', 'income_tax_rate',
        'labor_tax_rate', 'social_security_rate',
        'sales_tax_rate', 'territorial_tax_rate',
    )
    def _compute_taxes(self):
        for rec in self:
            net = max(rec.gross_income - rec.total_purchases, 0.0)
            rec.net_income = net
            if rec.use_progressive_is:
                rec.income_tax = rec._get_monthly_is_progressive(net)
            else:
                rec.income_tax = net * rec.income_tax_rate / 100.0
            rec.labor_tax = rec.total_wages * rec.labor_tax_rate / 100.0
            rec.social_security = rec.total_wages * rec.social_security_rate / 100.0
            rec.sales_tax = rec.gross_income * rec.sales_tax_rate / 100.0
            rec.territorial_tax = rec.gross_income * rec.territorial_tax_rate / 100.0
            rec.total_to_pay = (
                rec.income_tax + rec.labor_tax + rec.social_security
                + rec.sales_tax + rec.territorial_tax
            )

    def _get_monthly_is_progressive(self, monthly_net):
        """Calcula el IS mensual anualizando y aplicando la escala progresiva cubana.

        Método: (ingreso neto mensual × 12) → IS anual por tramos → IS anual / 12.
        Esto genera el anticipo mensual. La DJ Anual concilia el total real.
        """
        annual_net = monthly_net * 12
        if annual_net <= 0:
            return 0.0
        brackets = self.env['sweet.tax.bracket'].search(
            [('tax_type', '=', 'is_income'), ('active', '=', True)],
            order='limit_from',
        )
        if not brackets:
            # Fallback a tasa plana si no hay tramos configurados
            return monthly_net * self.income_tax_rate / 100.0
        annual_tax = 0.0
        for bracket in brackets:
            limit_from = bracket.limit_from
            limit_to = bracket.limit_to if bracket.limit_to > 0 else float('inf')
            if annual_net <= limit_from:
                break
            taxable = min(annual_net, limit_to) - limit_from
            if taxable > 0:
                annual_tax += taxable * bracket.rate / 100.0
        return annual_tax / 12.0

    # ── Auto-compute from accounting ─────────────
    def action_compute_from_accounting(self):
        """Calcula automáticamente las bases desde la contabilidad de Odoo."""
        self.ensure_one()
        from_date = '%d-%02d-01' % (self.year, int(self.month))
        import calendar
        last_day = calendar.monthrange(self.year, int(self.month))[1]
        to_date = '%d-%02d-%02d' % (self.year, int(self.month), last_day)

        # Gross income: posted invoices (customer) in the period
        domain_inv = [
            ('move_type', 'in', ('out_invoice', 'out_refund')),
            ('state', '=', 'posted'),
            ('invoice_date', '>=', from_date),
            ('invoice_date', '<=', to_date),
            ('company_id', '=', self.company_id.id),
        ]
        invoices = self.env['account.move'].search(domain_inv)
        gross = sum(
            m.amount_untaxed if m.move_type == 'out_invoice' else -m.amount_untaxed
            for m in invoices
        )

        # Purchases: posted vendor bills in the period
        domain_pur = [
            ('move_type', 'in', ('in_invoice', 'in_refund')),
            ('state', '=', 'posted'),
            ('invoice_date', '>=', from_date),
            ('invoice_date', '<=', to_date),
            ('company_id', '=', self.company_id.id),
        ]
        purchases = self.env['account.move'].search(domain_pur)
        total_pur = sum(
            m.amount_untaxed if m.move_type == 'in_invoice' else -m.amount_untaxed
            for m in purchases
        )

        # Wages: from hr.payslip or hr.version wage × employee count (fallback)
        wage_total = 0.0
        if 'hr.payslip' in self.env:
            payslips = self.env['hr.payslip'].search([
                ('state', 'in', ('done', 'paid')),
                ('date_from', '>=', from_date),
                ('date_to', '<=', to_date),
                ('company_id', '=', self.company_id.id),
            ])
            wage_total = sum(p.basic_wage for p in payslips if hasattr(p, 'basic_wage'))

        if wage_total == 0.0:
            # Fallback: active contracts × wage
            contracts = self.env['hr.version'].search([
                ('company_id', '=', self.company_id.id),
                ('contract_state', '=', 'open'),
            ])
            wage_total = sum(contracts.mapped('wage'))

        self.write({
            'gross_income': gross,
            'total_purchases': total_pur,
            'total_wages': wage_total,
            'state': 'computed',
        })
        self.message_post(body=_('Bases calculadas automáticamente desde contabilidad.'))

    def action_submit(self):
        for rec in self:
            if rec.state != 'computed':
                raise ValidationError(_('Calcula primero los montos antes de presentar.'))
            rec.state = 'submitted'
            rec.message_post(body=_(  
                'Declaración presentada a la ONAT. Total a pagar: %s CUP'
            ) % '{:,.2f}'.format(rec.total_to_pay))

    def action_draft(self):
        """Regresa a borrador. Las declaraciones presentadas requieren permiso de admin."""
        for rec in self:
            if rec.state == 'submitted' and not self.env.user.has_group(
                'sweet_cafe_management.sweet_group_admin'
            ):
                raise UserError(_(
                    'Solo el administrador puede revertir una declaración ya presentada.'
                ))
        self.state = 'draft'

    # ── ORM overrides (protección integridad fiscal) ──

    _LOCKED_FIELDS = frozenset({
        'year', 'month', 'company_id',
        'gross_income', 'total_purchases', 'total_wages',
        'income_tax_rate', 'labor_tax_rate', 'social_security_rate',
        'sales_tax_rate', 'territorial_tax_rate', 'use_progressive_is',
    })

    def write(self, vals):
        submitted = self.filtered(lambda r: r.state == 'submitted')
        if submitted:
            forbidden = set(vals.keys()) & self._LOCKED_FIELDS
            if forbidden:
                raise UserError(_(
                    'No puede modificar una declaración ya presentada a la ONAT. '
                    'Campos bloqueados: %s'
                ) % ', '.join(sorted(forbidden)))
        return super().write(vals)

    def unlink(self):
        if any(r.state == 'submitted' for r in self):
            raise UserError(_(
                'No puede eliminar una declaración ONAT ya presentada. '
                'Los registros fiscales deben conservarse mínimo 5 años (Ley 113).'
            ))
        return super().unlink()

    @api.constrains('year', 'month', 'company_id')
    def _check_unique(self):
        for rec in self:
            duplicate = self.search([
                ('year', '=', rec.year),
                ('month', '=', rec.month),
                ('company_id', '=', rec.company_id.id),
                ('id', '!=', rec.id),
            ])
            if duplicate:
                raise ValidationError(
                    _('Ya existe una declaración ONAT para %s/%s en esta empresa.') % (rec.month, rec.year)
                )

    def action_open_export_wizard(self):
        """Abre el wizard de exportación (Excel / CSV / PDF)."""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': _('Exportar Declaración ONAT'),
            'res_model': 'sweet.onat.export.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_report_id': self.id},
        }

    def action_print_pdf(self):
        """Genera y descarga el PDF de la declaración ONAT directamente."""
        self.ensure_one()
        return self.env.ref(
            'sweet_cafe_management.action_report_onat_declaration'
        ).report_action(self)

    def action_open_import_wizard(self):
        """Abre el wizard de importación CSV."""
        return {
            'type': 'ir.actions.act_window',
            'name': _('Importar Declaraciones ONAT'),
            'res_model': 'sweet.onat.import.wizard',
            'view_mode': 'form',
            'target': 'new',
        }

    def action_mark_submitted(self):
        self.action_submit()
