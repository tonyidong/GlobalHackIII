var Sensi = Sensi || {};

Sensi.weatherModel = function () {
    var self = this;
    
    self.CurrentTemp = ko.observable();
    self.HighTemp = ko.observable();
    self.LowTemp = ko.observable();
    self.Condition = ko.observable().extend({ prefix: 'weather' });
    self.Location = ko.observable();
    self.Today = ko.observable(new Date());
    
    self.Update = function(model) {
        if (!model) return;

        self.CurrentTemp(model.CurrentTemp);
        self.HighTemp(model.HighTemp);
        self.LowTemp(model.LowTemp);
        self.Condition(model.ConditionId);
        self.Location(model.Location.City + ", " + model.Location.State);
        self.Today(new Date());
    };
};
