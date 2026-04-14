from datetime import datetime

from odoo import _
from odoo import models


class SummaryRegistrationsInternalMovementsReport(models.AbstractModel):
    _name = 'report.l10n_cu_hr_payroll_movement.summary_movements_report'
    _description = 'Summary of registrations and internal movements Report'

    def generate_xlsx_report(self, workbook, data, objs):
        # Add an image
        # img_path = get_module_resource('l10n_cu_hr_payroll_movement', 'static', 'src', 'img', 'logo.png')
        # img_path_2 = get_module_resource('l10n_cu_hr_payroll_movement', 'static', 'src', 'img', 'logo2.jpg')
        company_data = data['company_data']
        worksheet = workbook.add_worksheet(_('Summary of registrations and internal movements'))

        # Formats
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D9D9D9', 'border': 1, 'align': 'center'})
        body_format = workbook.add_format({'border': 1, 'align': 'center'})
        body_company_format = workbook.add_format({'border': 1})
        footer_format = workbook.add_format({'bold': True, 'bg_color': '#D9D9D9', 'border': 1, 'align': 'center'})
        bold_format = workbook.add_format({'bold': True})

        # Set column widths
        worksheet.set_column('F:F', 5)  # No.
        worksheet.set_column('G:G', 30)  # EMPRESAS
        worksheet.set_column('H:H', 10)  # ALTAS
        worksheet.set_column('I:I', 10)  # MOV.INT
        worksheet.set_column('J:J', 10)  # TOTAL

        # Header
        # worksheet.insert_image('G2', img_path, {'x_scale': 0.1, 'y_scale': 0.1, 'x_offset': 25, 'y_offset': 10})
        # worksheet.insert_image('J2', img_path_2, {'x_scale': 0.2, 'y_scale': 0.2, 'x_offset': 25, 'y_offset': 10})

        current_date = datetime.now()
        month_year = f"{current_date.strftime('%B').upper()} / {current_date.year}"

        worksheet.write(8, 5, f'RESUMEN DE ALTAS Y MOVIMIENTOS INTERNOS / {month_year}', bold_format)
        worksheet.write(9, 5, 'No.', header_format)
        worksheet.write(9, 6, 'EMPRESAS', header_format)
        worksheet.write(9, 7, 'ALTAS', header_format)
        worksheet.write(9, 8, 'MOV.INT', header_format)
        worksheet.write(9, 9, 'TOTAL', header_format)

        # Data
        row = 10
        total_altas = 0
        total_movimientos = 0
        for index, company in enumerate(company_data, start=1):
            worksheet.write(row, 5, index, body_format)
            worksheet.write(row, 6, company['company_name'], body_company_format)
            altas = company['altas'] if company['altas'] != 0 else '-'
            cambios = company['cambios'] if company['cambios'] != 0 else '-'
            worksheet.write(row, 7, altas, body_format)
            worksheet.write(row, 8, cambios, body_format)
            total = company['altas'] + company['cambios']
            total = total if total != 0 else '-'
            worksheet.write(row, 9, total, body_format)
            total_altas += company['altas']
            total_movimientos += company['cambios']
            row += 1

        # Footer
        worksheet.merge_range(row, 5, row, 6, 'TOTAL', footer_format)
        worksheet.write(row, 7, total_altas if total_altas != 0 else '-', footer_format)
        worksheet.write(row, 8, total_movimientos if total_movimientos != 0 else '-', footer_format)
        total_general = total_altas + total_movimientos
        worksheet.write(row, 9, total_general if total_general != 0 else '-', footer_format)
