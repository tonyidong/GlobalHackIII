var Sensi = Sensi || {};
Sensi.Config = Sensi.Config || {};
Sensi.Config.SevenDaysMinimumDuration = 1.75;

Sensi.schedule = function (spec, options) {
    var self = this;
    var weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    var weekdaysInOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var saveCallback = options.save;
    var validateName = options.validateName;
    
    options.save = function () { saveCallback(self); };
    options.weekdays = weekdays;

    self.Name = ko.observable(spec.Name).extend({ trackable: true});
    self.ObjectId = spec.ObjectId;
    self.Type = spec.Type;

    var daily = [];
    $.each(spec.Daily, function (_, group) {
        daily.push(new Sensi.dayGroup(group, options));
    });
    self.Daily = ko.observableArray(daily);

    self.AddDayGroup = function (weekday) {
        if (self.Daily().length >= 7) return;
        if (weekdays.indexOf(weekday) === -1) return;

        $.each(self.Daily(), function (_, group) {
            var index = group.Days.indexOf(weekday);
            if (index === -1) return;
            group.Days.splice(index, 1);
        });

        var group = { Days: [weekday], Steps: [options.template] };
        self.Daily.push(new Sensi.dayGroup(group, options));
    };

    self.Save = function () {
        var remove = [];

        $.each(self.Daily(), function (index, group) {
            if (group.Days().length === 0) {
                remove.push(index);
            }
        });

        $.each(remove, function (_, i) { self.Daily.splice(i, 1); });

        saveCallback(self);
    };

    self.SevenDays = ko.computed(function () {
        var dayGroups = self.Daily();

        return $.map(weekdays, function (weekday) {
            var groups = $.grep(dayGroups, function (dayGroup) { return dayGroup.Days.indexOf(weekday) !== -1; });
            var group = groups[0] || { Steps: ko.observableArray() };

            return { 'Day': weekday, 'Steps': group.Steps };
        });
    });
    
    self.SevenDays.Times = ko.computed(function() {
        var times = [];
        var dayGroups = self.Daily();

        $.each(dayGroups, function (_, dayGroup) {
            var steps = dayGroup.Steps();
            
            $.each(steps, function(_, setpoint) {
                var time = setpoint.Time();

                if (times.indexOf(time) === -1)
                    times.push(time);
            });
        });
        
        times = times.sort();
        
        var result = [];
        $.each(times, function (i, time) {
            if (i == 0) {
                result.push(time);
            }
            else {
                var currentTime = ko.bindingHandlers.displayTime.parse(time).value;
                var previousTime = ko.bindingHandlers.displayTime.parse(result[result.length - 1]).value;
                
                if (currentTime - previousTime > Sensi.Config.SevenDaysMinimumDuration) {
                    result.push(time);
                }
            }
        });

        return result;
    });

    self.IsWeekdayInGroup = function (weekday, groupIndex) {
        return groupIndex >= 0
            && groupIndex < self.Daily().length
            && self.Daily()[groupIndex].Days()
            && self.Daily()[groupIndex].Days().indexOf(weekday) != -1;
    };

    self.SelectCurrentDay = function() {

        var today = weekdaysInOrder[new Date().getDay()];

        $.each(self.Daily(), function(index) {
            if (self.IsWeekdayInGroup(today, index)) {
                self.CurrentDayGroup(index);
                return false;
            }
        });
    };

    self.UpdateName = function () {
        if (validateName(self.Name(), self.ObjectId)) {
            saveCallback(self)
                .fail(function() { self.Name.reset(); })
                .done(function() { self.Name.commit(); });
        } else {
            Sensi.Session.Notifications([Error("Name is already in use")]);
        }
    };
    
    self.CurrentDayGroup = ko.observable(0).extend({ sessionStorage: 'currentDayGroup' });
};