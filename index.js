$(function () {
    infuser.defaults.ajax.cache = false;
    infuser.defaults.templateUrl = "partials/";
    $.fn.editable.defaults.mode = 'inline';
    
    $('body').popover({selector: '[rel=popover]'});
    $('body').on('click', '#ec-navigation .ec-nav-item', function (e) {
        $('#ec-navigation .ec-nav-item').removeClass('active');
        $(e.target).addClass('active');
    });
    $('body').on('click', '#schedule-timeline-container', function() {
        var navItems = $('#ec-navigation .ec-nav-item');
        navItems.removeClass('active');
        $(navItems[0]).addClass('active');
    });

    jQuery.validator.addMethod("data-rule-zip", function (value, element) {

        var country = $(element).attr('data-rule-zip');
        var expression = country == "US" ? /^\d{5}$/ : /^[ABCEGHJKLMNPRSTVXYabceghjklmnprstvxy]{1}\d{1}[A-Za-z]{1} *\d{1}[A-Za-z]{1}\d{1}$/;

        return this.optional(element) || value.match(expression);
        
    }, "Please enter a valid zip code");

    jQuery.validator.addMethod('data-rule-zip-remote', function(value, element) {
        if (this.optional(element)) {
            return "dependency-mismatch";
        }

        var previous = this.previousValue(element);
        if (!this.settings.messages[element.name]) {
            this.settings.messages[element.name] = {};
        }
        previous.originalMessage = this.settings.messages[element.name].remote;
        this.settings.messages[element.name].remote = previous.message;
        
        if (previous.old === value) {
            return previous.valid;
        }

        previous.old = value;
        var validator = this;
        this.startRequest(element);
        var data = {};
        data[element.name] = value;

        var countryCode = $(element).attr('data-rule-zip');
        var postalCode = value;
        var valid = previous.valid;

        Sensi.JsonRequest("GET", Sensi.GetPostalCodeEndpoint + '/' + countryCode + '/' + postalCode)
            .always(function() {
                validator.settings.messages[element.name].remote = previous.originalMessage;
            })
            .done(function(_) {
                var submitted = validator.formSubmitted;
                validator.prepareElement(element);
                validator.formSubmitted = submitted;
                validator.successList.push(element);
                delete validator.invalid[element.name];
                validator.showErrors();
                valid = true;
            })
            .fail(function() {
                var errors = {};
                var message = validator.defaultMessage(element, "zip-remote");
                errors[element.name] = previous.message = $.isFunction(message) ? message(value) : message;
                validator.invalid[element.name] = true;
                validator.showErrors(errors);
                valid = false;
            })
            .always(function() {
                previous.valid = valid;
                validator.stopRequest(element, valid);
            });
        return "pending";
    }, 'Please enter a valid postal code');

    jQuery.validator.addMethod('data-rule-schedule-name', function (value) {
        return Sensi.Session.CurrentThermostat().Schedules.ValidateScheduleName(value);
    }, '<span>This name is already in use, please choose another name</span>');
    
    Sensi.Setup();
});