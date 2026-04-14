odoo.define('l10n_cu_hr.employee_search_panel', function (require) {
    "use strict";

    var SearchPanel = require('web.SearchPanel');
    var session = require('web.session');

    SearchPanel.include({
        /**
         * @override
         */
        _onCompanyChanged: function () {
            this._super.apply(this, arguments);
            // Cuando cambia la compañía, recarga el panel de búsqueda
            if (this.model === 'hr.employee') {
                this._fetchSections();
            }
        },
    });
});