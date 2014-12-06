var Sensi = Sensi || {};

Sensi.thermostatSummaryModel = function (summaryInfo, weatherUpdateCallback) {
    var self = this;

    self.ICD = summaryInfo.ICD;
    self.ContractorId = ko.observable(summaryInfo.ContractorId).extend({ trackable: true });
    self.Contractor = {};
    self.DeviceName = ko.observable(summaryInfo.DeviceName).extend({ trackable: true });
    self.ZipCode = ko.observable(summaryInfo.ZipCode).extend({ trackable: true });
    self.Country = ko.observable(summaryInfo.Country.trim()).extend({ trackable: true });
    self.TimeZone = ko.observable(summaryInfo.TimeZone).extend({ trackable: true });
        
    self.Error = ko.observable();
     

    self.TimeZones = ko.computed(function () {
        return Sensi.TimeZones()[self.Country()];
    });

    self.SetContractor = function(contractorInfo) {
        self.Contractor = contractorInfo;
    };

    self.Commit = function () {
        var method = Sensi.UpdateThermostatSummary(self.ICD, self.ContractorId(), self.DeviceName(), self.ZipCode(), self.Country(), self.TimeZone())
            .fail(function(ajax, error, errorMessage) {
                self.Error(errorMessage);
            })
            .done(function() {
                Sensi.Session.Notifications([Message('Thermostat info updated succesfully.')]);
                Sensi.Ui.UpdateDisplayName();
                Sensi.Ui.UpdateLocationInfo();

                self.DeviceName.commit();
                self.ContractorId.commit();
                self.ZipCode.commit();
                self.Country.commit();
                self.TimeZone.commit();
            });
        
        return method.promise();
    };

    self.removeContractor = function () {
        self.ContractorId(0);
        self.Commit()
            .done(function () { self.Contractor = {}; })
            .fail(function () { self.ContractorId.reset(); });
    };

    self.CommitLocationInfo = function () {
        self.Commit()
            .done(function() {
                Sensi.GetThermostatWeather(self.ICD)
                    .done(weatherUpdateCallback);
            });
    };

    self.Reset = function() {
        self.DeviceName.reset();
        self.ZipCode.reset();
        self.Country.reset();
        self.TimeZone.reset();
    };
};