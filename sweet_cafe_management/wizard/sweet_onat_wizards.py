# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.
"""
Wizard de exportación / importación ONAT.

Export: genera CSV, XLSX (Excel) o PDF con los datos de la declaración.
Import: permite cargar declaraciones previas desde CSV o XLSX para histórico.
"""
import base64
import csv
import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, numbers
from openpyxl.utils import get_column_letter
from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError


class SweetOnatExportWizard(models.TransientModel):
    """Exporta la declaración ONAT a CSV, Excel o PDF."""
    _name = 'sweet.onat.export.wizard'
    _description = 'Exportar Declaración ONAT'

    report_id = fields.Many2one(
        'sweet.onat.report', string='Declaración', required=True,
        default=lambda self: self.env.context.get('active_id'),
    )
    export_format = fields.Selection([
        ('xlsx', 'Excel (.xlsx)'),
        ('csv', 'CSV (.csv)'),
        ('pdf', 'PDF'),
    ], string='Formato', default='xlsx', required=True)

    # Output
    file_data = fields.Binary(string='Archivo', readonly=True)
    file_name = fields.Char(string='Nombre del archivo', readonly=True)
    state = fields.Selection([('draft', 'Listo'), ('done', 'Generado')], default='draft')

    # ── helpers ─────────────────────────────────────────────────────────

    def _get_rows(self, rep):
        """Devuelve (header_rows, data_rows) para usar en CSV y XLSX."""
        months = dict(rep._fields['month'].selection)
        month_name = months.get(rep.month, rep.month)
        state_label = dict(rep._fields['state'].selection).get(rep.state, rep.state)

        info = [
            ['Empresa', rep.company_id.name],
            ['NIT', rep.company_id.nit or '—'],
            ['Período', '%s / %d' % (month_name, rep.year)],
            ['Estado', state_label],
        ]

        bases = [
            ['CONCEPTO', 'IMPORTE (CUP)'],
            ['Ingresos Brutos', rep.gross_income],
            ['Gastos Deducibles', rep.total_purchases],
            ['Ingresos Netos (Base IS)', rep.net_income],
            ['Salarios Pagados (Base IUFT/CSS)', rep.total_wages],
        ]

        taxes = [
            ['IMPUESTO', 'TASA (%)', 'IMPORTE (CUP)'],
            ['Impuesto sobre Ingresos (IS)', rep.income_tax_rate, rep.income_tax],
            ['IUFT (Fuerza de Trabajo)', rep.labor_tax_rate, rep.labor_tax],
            ['Contribución SS Empleador', rep.social_security_rate, rep.social_security],
            ['Impuesto sobre Ventas', rep.sales_tax_rate, rep.sales_tax],
            ['Contribución Territorial', rep.territorial_tax_rate, rep.territorial_tax],
            ['TOTAL A PAGAR', '', rep.total_to_pay],
        ]

        payment = [
            ['DATOS DE PAGO', ''],
            ['Fecha de Pago', str(rep.payment_date) if rep.payment_date else '—'],
            ['Referencia Bancaria', rep.payment_reference or '—'],
            ['Monto Pagado (CUP)', rep.payment_amount],
        ]

        notes = [['Observaciones', rep.notes or '']]

        return info, bases, taxes, payment, notes

    # ── export CSV ──────────────────────────────────────────────────────

    def _export_csv(self, rep):
        info, bases, taxes, payment, notes = self._get_rows(rep)
        output = io.StringIO()
        writer = csv.writer(output, delimiter=',', quoting=csv.QUOTE_MINIMAL)

        writer.writerow(['Declaración ONAT — Sweet Café'])
        for row in info:
            writer.writerow(row)
        writer.writerow([])
        writer.writerow(['BASES IMPONIBLES'])
        for row in bases:
            writer.writerow([str(c) for c in row])
        writer.writerow([])
        writer.writerow(['IMPUESTOS'])
        for row in taxes:
            writer.writerow([str(c) for c in row])
        writer.writerow([])
        for row in payment:
            writer.writerow([str(c) for c in row])
        writer.writerow([])
        for row in notes:
            writer.writerow(row)

        csv_bytes = output.getvalue().encode('utf-8-sig')  # BOM para Excel
        return base64.b64encode(csv_bytes)

    # ── export XLSX ─────────────────────────────────────────────────────

    def _export_xlsx(self, rep):
        info, bases, taxes, payment, notes = self._get_rows(rep)

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Declaración ONAT'

        # ── Estilos ──
        TITLE_FILL = PatternFill('solid', fgColor='1F4E79')
        TITLE_FONT = Font(bold=True, color='FFFFFF', size=13)
        HEADER_FILL = PatternFill('solid', fgColor='2E75B6')
        HEADER_FONT = Font(bold=True, color='FFFFFF', size=10)
        SECTION_FILL = PatternFill('solid', fgColor='D6E4F0')
        SECTION_FONT = Font(bold=True, size=10)
        TOTAL_FONT = Font(bold=True, size=10)
        MONEY_FMT = '#,##0.00'
        PCT_FMT = '0.00"%"'

        def set_row(ws, row_num, values, fill=None, font=None, number_format=None):
            for col, val in enumerate(values, 1):
                cell = ws.cell(row=row_num, column=col, value=val)
                if fill:
                    cell.fill = fill
                if font:
                    cell.font = font
                if number_format and isinstance(val, (int, float)):
                    cell.number_format = number_format
            return row_num + 1

        r = 1

        # Título
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=3)
        cell = ws.cell(row=r, column=1, value='Declaración ONAT — Sweet Café')
        cell.fill = TITLE_FILL
        cell.font = TITLE_FONT
        cell.alignment = Alignment(horizontal='center')
        r += 1

        # Info empresa
        for row in info:
            r = set_row(ws, r, row)
        r += 1

        # Sección: Bases Imponibles
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
        ws.cell(row=r, column=1, value='BASES IMPONIBLES').fill = SECTION_FILL
        ws.cell(row=r, column=1).font = SECTION_FONT
        r += 1
        r = set_row(ws, r, bases[0], fill=HEADER_FILL, font=HEADER_FONT)
        for row in bases[1:]:
            r = set_row(ws, r, row, number_format=MONEY_FMT)
        r += 1

        # Sección: Impuestos
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=3)
        ws.cell(row=r, column=1, value='IMPUESTOS').fill = SECTION_FILL
        ws.cell(row=r, column=1).font = SECTION_FONT
        r += 1
        r = set_row(ws, r, taxes[0], fill=HEADER_FILL, font=HEADER_FONT)
        for row in taxes[1:-1]:
            ws.cell(row=r, column=1, value=row[0])
            ws.cell(row=r, column=2, value=row[1]).number_format = PCT_FMT if isinstance(row[1], float) else '@'
            c = ws.cell(row=r, column=3, value=row[2])
            c.number_format = MONEY_FMT
            r += 1
        # Total
        total_row = taxes[-1]
        ws.cell(row=r, column=1, value=total_row[0]).font = TOTAL_FONT
        ws.cell(row=r, column=3, value=total_row[2]).number_format = MONEY_FMT
        ws.cell(row=r, column=3).font = TOTAL_FONT
        r += 2

        # Sección: Pago
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
        ws.cell(row=r, column=1, value='PAGO').fill = SECTION_FILL
        ws.cell(row=r, column=1).font = SECTION_FONT
        r += 1
        for row in payment[1:]:
            r = set_row(ws, r, row, number_format=MONEY_FMT)
        r += 1

        # Observaciones
        ws.cell(row=r, column=1, value='Observaciones').font = SECTION_FONT
        ws.cell(row=r, column=2, value=notes[0][1] if notes else '')
        r += 1

        # Anchos de columna
        ws.column_dimensions['A'].width = 38
        ws.column_dimensions['B'].width = 16
        ws.column_dimensions['C'].width = 16

        buf = io.BytesIO()
        wb.save(buf)
        return base64.b64encode(buf.getvalue())

    # ── action_export ────────────────────────────────────────────────────

    def action_export(self):
        self.ensure_one()
        rep = self.report_id
        safe_name = rep.company_id.name.replace(' ', '_')
        base_fname = 'ONAT_%s_%d_%s' % (rep.month, rep.year, safe_name)

        if self.export_format == 'xlsx':
            file_data = self._export_xlsx(rep)
            fname = base_fname + '.xlsx'
        elif self.export_format == 'pdf':
            return self._export_pdf(rep)
        else:
            file_data = self._export_csv(rep)
            fname = base_fname + '.csv'

        self.write({'file_data': file_data, 'file_name': fname, 'state': 'done'})
        return {
            'type': 'ir.actions.act_window',
            'res_model': self._name,
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'new',
        }

    def _export_pdf(self, rep):
        """Genera el PDF mediante el reporte QWeb y lo devuelve como descarga."""
        report = self.env.ref('sweet_cafe_management.action_report_onat_declaration')
        pdf_content, _ = self.env['ir.actions.report']._render_qweb_pdf(
            report, res_ids=rep.ids,
        )
        fname = 'ONAT_%s_%d_%s.pdf' % (
            rep.month, rep.year, rep.company_id.name.replace(' ', '_'))
        file_data = base64.b64encode(pdf_content)
        self.write({'file_data': file_data, 'file_name': fname, 'state': 'done'})
        return {
            'type': 'ir.actions.act_window',
            'res_model': self._name,
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'new',
        }

    def action_download(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_url',
            'url': '/web/content?model=%s&id=%d&field=file_data&filename_field=file_name&download=true' % (
                self._name, self.id,
            ),
            'target': 'self',
        }


class SweetOnatImportWizard(models.TransientModel):
    """Importa declaraciones ONAT históricas desde CSV o Excel."""
    _name = 'sweet.onat.import.wizard'
    _description = 'Importar Declaraciones ONAT'

    file_data = fields.Binary(string='Archivo (CSV o Excel)', required=True)
    file_name = fields.Char(string='Nombre del archivo')
    result_summary = fields.Text(string='Resultado', readonly=True)
    state = fields.Selection([('draft', 'Listo'), ('done', 'Procesado')], default='draft')

    # ── parsers ─────────────────────────────────────────────────────────

    def _parse_csv(self, raw):
        """Devuelve lista de dicts con las columnas del CSV."""
        try:
            content = raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            content = raw.decode('latin-1')
        reader = csv.DictReader(io.StringIO(content))
        required = {'year', 'month', 'gross_income', 'total_wages', 'total_purchases'}
        if not required.issubset(set(reader.fieldnames or [])):
            raise ValidationError(
                _('El CSV debe tener estas columnas: %s') % ', '.join(sorted(required))
            )
        return list(reader)

    def _parse_xlsx(self, raw):
        """Devuelve lista de dicts a partir de un Excel con cabecera en fila 1."""
        wb = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            raise ValidationError(_('El archivo Excel está vacío.'))
        headers = [str(h).strip() if h is not None else '' for h in rows[0]]
        required = {'year', 'month', 'gross_income', 'total_wages', 'total_purchases'}
        if not required.issubset(set(headers)):
            raise ValidationError(
                _('El Excel debe tener estas columnas en la fila 1: %s') % ', '.join(sorted(required))
            )
        result = []
        for row in rows[1:]:
            if all(v is None for v in row):
                continue
            result.append(dict(zip(headers, row)))
        return result

    def _rows_to_records(self, rows):
        """Procesa lista de dicts y crea/omite registros. Devuelve (created, skipped, errors)."""
        created = 0
        skipped = 0
        errors = []
        for i, row in enumerate(rows, start=2):
            try:
                year = int(row['year'] or 0)
                month = str(int(float(str(row['month'] or 0))))
                gross = float(row['gross_income'] or 0)
                wages = float(row['total_wages'] or 0)
                purchases = float(row['total_purchases'] or 0)
                income_rate = float(row.get('income_tax_rate') or 35.0)
                labor_rate = float(row.get('labor_tax_rate') or 5.0)
                ss_rate = float(row.get('social_security_rate') or 14.0)
                sales_rate = float(row.get('sales_tax_rate') or 0.0)
                notes = str(row.get('notes') or '')
            except (ValueError, KeyError, TypeError) as e:
                errors.append(_('Fila %d: %s') % (i, str(e)))
                continue

            existing = self.env['sweet.onat.report'].search([
                ('year', '=', year),
                ('month', '=', month),
                ('company_id', '=', self.env.company.id),
            ])
            if existing:
                skipped += 1
                continue

            self.env['sweet.onat.report'].create({
                'year': year,
                'month': month,
                'gross_income': gross,
                'total_wages': wages,
                'total_purchases': purchases,
                'income_tax_rate': income_rate,
                'labor_tax_rate': labor_rate,
                'social_security_rate': ss_rate,
                'sales_tax_rate': sales_rate,
                'notes': notes,
                'state': 'computed',
                'company_id': self.env.company.id,
            })
            created += 1

        return created, skipped, errors

    # ── action ──────────────────────────────────────────────────────────

    def action_import(self):
        self.ensure_one()
        if not self.file_data:
            raise UserError(_('Por favor selecciona un archivo CSV o Excel.'))

        raw = base64.b64decode(self.file_data)
        fname = (self.file_name or '').lower()

        if fname.endswith('.xlsx') or fname.endswith('.xls'):
            rows = self._parse_xlsx(raw)
        else:
            rows = self._parse_csv(raw)

        created, skipped, errors = self._rows_to_records(rows)

        summary_parts = [
            _('✅ %d declaraciones importadas.') % created,
            _('⏭️ %d omitidas (ya existen).') % skipped,
        ]
        if errors:
            summary_parts.append(_('❌ Errores:\n') + '\n'.join(errors))

        self.write({'result_summary': '\n'.join(summary_parts), 'state': 'done'})
        return {
            'type': 'ir.actions.act_window',
            'res_model': self._name,
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'new',
        }
