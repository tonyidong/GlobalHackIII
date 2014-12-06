var Sensi = Sensi || {};
Sensi.Ui = Sensi.Ui || {};
Sensi.Config = Sensi.Config || {};

Sensi.Ui.LoadLoginPage = function() {
    $("body").backstretch("img/bg-login-alt.jpg");
    
    var loginBox = $("#login-top .tab-content");
    var loginPos = ($(window).height()/3.5)-(loginBox.height()/3);
    
    $(window).resize(function(){
         loginPos = ($(window).height()/3.5)-(loginBox.height()/3);
         loginBox.css("margin-top", loginPos + "px");
    });
    loginBox.css("margin-top", loginPos + "px");
    loginBox.validate({
        rules: {
            username: {
                required: true,
                email: true
            },
            password: {
                required: true
            },
        },
        messages: {
            password: {
                required: "Please provide your password.",
            },
            email: "Please enter a valid email address.",
        },
        submitHandler: function(form) {
            form.submit();
        }
    });  
    
    $(".close-notification").click(function() {
        $(this).parent().remove();
    });
    $('input, textarea').placeholder();


    $('#schedule-menu').popover({
        trigger: 'manual'
    }).click(function (e) {
        $(this).popover('toggle');
    });
    
    $(document).click(function (e) {
        if (!$(e.target).is('#schedule-menu, .popover-title, .popover-content, .popover')) {
            $('#schedule-menu').popover('hide');
        }
    });

    //Capture current tab
    $('body').on('click', '#thermostat-tabs li a', function (e) {
        sessionStorage.ActiveTab = e.target.hash;
    });
};

Sensi.Ui.LoadControlsPage = function () {
    $(".close-notification").click(function() {
        $(this).parent().remove();
    });
    // Killing backstretch after login
    $("body").backstretch("img/bg-null.png");
};

Sensi.Ui.LoadSubPage = function() {
    $('#sub-pages').find('input, textarea').placeholder();
};

Sensi.Ui.ResizeTimeline = function() {
    $("#schedule-timeline-container").mCustomScrollbar('update');
};

Sensi.Ui.EditDisplayName = function (_, e) {
    var readonly = $(e.target).parents('.readonly');
    var writable = $(readonly).siblings('.writable');
    var writeableInput = writable.find('input');
    
    writable.show();
    writeableInput.focus();
    writeableInput.addClass('yellow-bg');
    readonly.hide();
};

Sensi.Ui.UpdateDisplayName = function (_, e) {
    if (!e) return;
        
    var writable = $(e.target).parents('.writable');
    var writeableInput = writable.find('input');
    var readonly = $(writable).siblings('.readonly');
    
    writable.hide();
    writeableInput.removeClass('yellow-bg');
    readonly.show();
};

Sensi.Ui.EditLocationInfo = function () {
    $('#locationEditableFields').show();
    $('#locationDisplayFields').hide();
};

Sensi.Ui.UpdateLocationInfo = function () {
    $('#locationEditableFields').hide();
    $('#locationDisplayFields').show();
};

Sensi.Ui.DisableCaptionOption = function (option, item) {
    ko.applyBindingsToNode(option, { disable: !item }, item);
};

Sensi.Ui.OnThermostatTabsRendered = function () {
    if (sessionStorage.ActiveTab) {
        var link = $('[href=' + sessionStorage.ActiveTab + ']');
        link.parent().removeClass('active');
        link.tab('show');
    }
};

Sensi.Ui.TriggerRadioChange = function (_, event) {
    var radio = $(event.target);
    var radioName = radio.attr('name');

    $('input[name=' + radioName + ']')
        .not(radio)
        .each(function(_, otherRadio) {
            $(otherRadio).triggerHandler('click');
        });
        
};

Sensi.Ui.EditScheduleDayGroups = function () {
    $('#accordion .day-grouping.in').collapse('hide');
    $('#accordion').addClass('on');
    $('.add-panel').toggle(true);
    $('#add-day-grouping').toggle(false);
    $('#cancel-day-grouping').toggle(true);
    $('.delete').hide();
};

Sensi.Ui.CancelScheduleDayGroups = function () {
    $('#accordion').removeClass('on');
    $('.add-panel').toggle(false);
    $('#add-day-grouping').toggle(true);
    $('#cancel-day-grouping').toggle(false);
    $('.delete').show();
};

Sensi.Ui.AdjustSetpointSpacing = function (steps, elements, current) {
    var drawingAreaWidth = 98;
    var totalPixels = parseInt($(elements).parents('.panel-group').css('width'),10);
    var elementPixels = parseInt($(elements).find('.timespan .temp').css('width'),10);
    
    if (totalPixels < 0 || isNaN(elementPixels)) return;

    
    var totalElementWidth = parseInt(elementPixels / totalPixels * 100 * steps.length,10);
    var elementWidth =  totalElementWidth / steps.length;
    var avaliableWidth = drawingAreaWidth - totalElementWidth;

    var minTime = ko.bindingHandlers.displayTime.parse(steps[0].Time()).value;
    var maxTime = ko.bindingHandlers.displayTime.parse(steps[steps.length - 1].Time()).value;
    var totalHours = maxTime - minTime;
    
    var currentIndex = $.inArray(current, steps);
    if (currentIndex < steps.length - 1) {
        var nextTime = ko.bindingHandlers.displayTime.parse(steps[currentIndex + 1].Time()).value;
        var currentTime = ko.bindingHandlers.displayTime.parse(current.Time()).value;
        var duration = nextTime - currentTime;
        var width = parseInt(duration / totalHours * avaliableWidth, 10);
        var adjustedWidth = width + elementWidth;
        
        $(elements).css({ width: adjustedWidth + '%' });
    }
};

Sensi.Ui.AdjustSevenDaySpacing = function (sevenDays, times, day, steps, elements, setpoint) {
    
    if (steps.length == 0)
        return;
    
    if (day !== sevenDays[sevenDays.length - 1].Day)
        return;
    
    if (setpoint.Time() !== steps[steps.length - 1].Time())
        return;


    var minimumDuration = Sensi.Config.SevenDaysMinimumDuration;
    var minTime = ko.bindingHandlers.displayTime.parse(times[0]);
    var pixelsPerHour = Sensi.Ui.getPixelsPerHour(elements, times);
    
    $.each(sevenDays, function (weekdayIndex, weekday) {
        var list = $('#schedule .seven-day ul')[weekdayIndex];

        $.each(weekday.Steps(), function (currentIndex, current) {
            
            var listItem = $(list).find('li')[currentIndex + 1];
            if ($(listItem).css('display') === 'none') 
                return true;

            var currentTime = ko.bindingHandlers.displayTime.parse(current.Time());
            if (currentIndex === 0 && times.indexOf(current.Time()) !== 0) {
                var hoursFromStart = currentTime.value - minTime.value;
                var pixelsFromStart = parseInt(hoursFromStart * pixelsPerHour, 10);
                $(listItem).css('margin-left', pixelsFromStart + 'px');
            }
                       
            if (currentIndex < weekday.Steps().length - 1) {
                for (var i = currentIndex + 1; i < weekday.Steps().length; i++) {
                    var nextTime = ko.bindingHandlers.displayTime.parse(weekday.Steps()[i].Time());
                    var duration = nextTime.value - currentTime.value;

                    if (duration <= minimumDuration) {
                        $($(list).find('li')[i + 1]).css('display', 'none');
                    }
                    else {
                        var width = parseInt(duration * pixelsPerHour, 10);

                        $(listItem).css({ width: width + 'px' });
                        break;
                    }
                }
            }
        });
    });
};

Sensi.Ui.AdjustTimelineSpacing = function (times, elements, current) {
    if (current != times[times.length - 1]) return;

    var pixelsPerHour = Sensi.Ui.getPixelsPerHour(elements, times);

    var list = $('#seven-day-time');
    $.each(times, function (i, time) {
        
        if (i < times.length - 1) {
            var listItem = $(list).find('li')[i];
            var currentTime = ko.bindingHandlers.displayTime.parse(time);
            var nextTime = ko.bindingHandlers.displayTime.parse(times[i + 1]);
            var duration = nextTime.value - currentTime.value;
            var width = parseInt(duration * pixelsPerHour, 10);
            
            $(listItem).css('width', width + 'px');
        }
    });
};

Sensi.Ui.getPixelsPerHour = function(elements,times) {
    var drawingAreaPadding = 60;
    var container = $(elements).parents('ul');
    var totalPixels = container.width();
    var offsetPixels = $(container.find('li')[0]).width();
    var availablePixels = totalPixels - offsetPixels - drawingAreaPadding;
    var maxTime = ko.bindingHandlers.displayTime.parse(times[times.length - 1]).value;
    var totalHours = maxTime - ko.bindingHandlers.displayTime.parse(times[0]).value;
    var pixelsPerHour = parseInt(availablePixels / totalHours, 10);

    return pixelsPerHour;
};
