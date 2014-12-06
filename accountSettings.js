var Sensi = Sensi || {};

Sensi.accountSettings = function()  {
    this.ChangePasswordModel = new Sensi.changePasswordModel();
    this.ChangeEmailModel = new Sensi.changeEmailModel();
    this.NewAccountModel = new Sensi.newAccountModel();
};

Sensi.changePasswordModel = function () {
    var self = this;

    self.PasswordResetRequired = ko.observable();
    self.Password = ko.observable();
    self.NewPassword = ko.observable();
    self.ConfirmPassword = ko.observable();
    self.Notifications = ko.observableArray();

    self.Update = function (formElement) {
        var model = ko.dataFor(formElement);
        Sensi.ChangePassword(model.Password(), model.NewPassword())
            .done(function () {
                self.Notifications([Message('Your password has succesfully been changed.')]);
                self.PasswordResetRequired(false);
            })
            .fail(function(ajax, error, errorMessage) {
                self.Notifications([Error(errorMessage)]);
            })
            .always(function() {
                self.Password('');
                self.NewPassword('');
                self.ConfirmPassword('');
            });
    };
    
    self.AcceptCurrent = function() {
        self.PasswordResetRequired(false);
    };
};

Sensi.changeEmailModel = function () {
    var self = this;

    self.Password = ko.observable();
    self.Email = ko.observable();
    self.Notifications = ko.observableArray([]);

    self.Update = function (formElement) {
        var model = ko.dataFor(formElement);
        Sensi.ChangeEmail(model.Email(), model.Password())
             .done(function () {
                 Sensi.Hub.stop();
                 Sensi.Login(model.Email(), model.Password());
             })
             .fail(function (ajax, error, errorMessage) {
                 self.Notifications([Error(errorMessage)]);
             })
            .always(function() {
                self.Password('');
            });
    };
};

Sensi.newAccountModel = function () {
    var self = this;
    self.Email = ko.observable();
    self.Password = ko.observable();
    self.Notifications = ko.observableArray([]);
    self.ConfirmationPassword = ko.observable();
    self.ConfirmationEmail = ko.observable();
    self.Terms = ko.observable();

    self.Register = function (formElement) {
        var model = ko.dataFor(formElement);
        Sensi.CreateAccount(model.Email(), model.Password())
            .done(function () {
                Sensi.Session.Notifications([Message('Your account has been created! An Email has been sent to the registered email account.')]);
                self.Clear();
                $('[href=#user-login]').tab('show');
            })
            .fail(function (ajax, error, errorMessage) {
                Sensi.Session.Notifications([Error(errorMessage)]);
            })
            .always(function () {
                self.Password('');
                self.ConfirmationPassword('');
            });
    };

    self.Clear = function() {
        self.Email('');
        self.ConfirmationEmail('');
        self.Password('');
        self.ConfirmationPassword('');
        self.Terms(false);
    };
};