function thermostatInfoModel() {
    var self = this;

    self.CurrentRuntime = ko.observable().extend({ counter: 1000 });
    self.ApplicationVersion = ko.observable();
    self.MacAddress = undefined;
    self.FirmwareVersion = undefined;
    self.ModelNumber = undefined;
    self.BatteryVoltage = ko.observable();
    self.IndoorEquipment = undefined;
    self.IndoorStages = undefined;
    self.OutdoorEquipment = undefined;
    self.OutdoorStages = undefined;

    self.Initialize = function(capabilities, product) {
        self.MacAddress = product.MacAddress;
        self.FirmwareVersion = product.Firmware.Thermostat;
        self.ModelNumber = product.ModelNumber;
        self.IndoorEquipment = capabilities.IndoorEquipment;
        self.IndoorStages = capabilities.IndoorStages;
        self.OutdoorEquipment = capabilities.OutdoorEquipment;
        self.OutdoorStages = capabilities.OutdoorStages;
    };

    self.Update = function (status) {
        if (!status) return;

        if (status.Running) {
            self.CurrentRuntime(status.Running.Time);
        }

        if (status.BatteryVoltage) {
            var millivolts = status.BatteryVoltage;
            var volts = millivolts / 1000;
            var rounded = volts.toFixed(1);
            
            self.BatteryVoltage(rounded);
        }
    };
}