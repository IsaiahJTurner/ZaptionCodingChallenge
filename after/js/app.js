var currentState = {
  user: {
    // token: String,
    // obj: Object
  },
  clientSecret: "g1A6kwsT2zGaUqP1gJfnU3naYXmjepvOFWboN8UoHK9AobNVwK5hW3b6Gw3Uq2O",
  zaptionAPIEndpoint: "https://www.zaption.com/api"
};
/**
 * Home Model
 */
var HomeModel = function() {
  var self = this;
  self.showPosts = function() {
    $("#login").modal();
  }
  return self;
}
ko.applyBindings(new HomeModel(), document.getElementById("home"));

/**
 * Tours Model
 */
var ToursModel = function() {
  var self = this;
  self.tours = ko.observableArray();
  self.page = ko.observable(0);
  self.resultsPerPage = ko.observable(9);
  self.totalCount = ko.observable(0);
  self.totalPages = ko.computed(function() {
    return Math.ceil(self.totalCount() / self.resultsPerPage());
  });
  /**
   * Loads tours based on the model parameters
   */
  self.page.subscribe(function(page) {
    if (self.searchQuery)
      self.searchQuery("");
    $.ajax({
      url: currentState.zaptionAPIEndpoint + "/tours",
      type: 'GET',
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", "Basic " + btoa(currentState.user.obj.id + ":" + currentState.user.token));
      },
      headers: {
        "API-Client-Secret": currentState.clientSecret
      },
      data: {
        page: self.page(),
        resultsPerPage: self.resultsPerPage()
      },
      success: function(data) {
        for (var i = 0; i < data.results.length; i++) {
          // add a protocol if it's missing. youtube has it, zaption doesn't.
          data.results[i].thumbLocation = ((data.results[i].thumbLocation.toLowerCase().indexOf("http") > -1) ? "" : "https:") + data.results[i].thumbLocation;
        }
        self.tours(data.results);
        self.totalCount(data.totalCount)
      },
      error: function(jqXHR, textStatus, errorThrow) {
        // i ignored error handling to save time and because there is no logical reason for it to error
        // note to self: http://www.zaption.com/api#errors
        alert(errorThrow); // i would never use alert() in production code.
        console.log(jqXHR, textStatus, errorThrow)
      }
    });

    /* begin search code */
    self.searchResults = ko.observableArray();
    self.searchQuery = ko.observable("");
    self.searchQuery.subscribe(function(query) {
      if (query.length == 0) {
        self.searchResults(new Array());
        return;
      }
      var allTours = self.tours();
      var results = new Array();
      // loops through results and checks for occurance of string
      for (var i = 0; i < allTours.length; i++) {
        if (allTours[i].name.toLowerCase().indexOf(query.toLowerCase()) > -1) {
          results.push(allTours[i]);
        }
      }
      self.searchResults(results);
    })

  });
  self.page.valueHasMutated(); // subscibe is not called for initial values so this will load the first page
  self.prevPage = function() {
    self.page(self.page() - 1);
  }
  self.nextPage = function() {
    self.page(self.page() + 1);
  }
  self.setPage = function(item, event) {
    self.page(Number($(event.target).text()) - 1); // we subtract 1 because the server index starts at 0
  }

  return self;
}

/**
 * Login Model
 */
var LoginModel = function() {
  var self = this;
  self.email = ko.observable("");
  self.password = ko.observable("");
  self.apiToken;

  self.login = function() {
    $.ajax({
      url: currentState.zaptionAPIEndpoint + "/user/login",
      type: 'POST',
      data: {
        username: self.email(),
        password: self.password()
      },
      headers: {
        "API-Client-Secret": currentState.clientSecret
      },
      success: function(data) {
        // saves login state so users can refresh
        if (typeof(Storage) !== "undefined")
          localStorage.setItem("loginResponse", JSON.stringify(data));
        currentState.user.token = data.token;
        currentState.user.obj = data.user;
        $("#login").modal('hide');
        // we create it now because we have a valid use session. before the request would have failed.
        ko.applyBindings(new ToursModel(), document.getElementById("tours"));
        $("#tours").removeClass("hidden");
        $("#home").addClass("hidden");
      },
      error: function(jqXHR, textStatus, errorThrow) {
        switch (errorThrow) {
          case "Unauthorized":
            {
              console.log("Invalid username or password.");
            }
          default:
            {
              console.log("An unknown error occurred");
            }
        }
        console.log(jqXHR, textStatus, errorThrow)
      },
      beforeSend: function(jqXHR, settings) {
        // saves login state so users can refresh
        if (typeof(Storage) !== "undefined") {
          var loginResponse = localStorage.getItem("loginResponse");
          if (loginResponse) {
            jqXHR.abort();
            this.success(JSON.parse(loginResponse));
          }
        }
      }
    });
  }
  return self;
};
ko.applyBindings(new LoginModel(), document.getElementById("login"));