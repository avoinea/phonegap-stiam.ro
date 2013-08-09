//var SERVER = 'http://192.168.1.103:16551/stiam.ro';
var SERVER = 'http://stiam.ro';

$.fn.rodate = function(options){
  var settings = {};

  var roformat = function(date){
    var now = $('#current-time');
    if(now.length){
      now = new Date(now.text());
    }else{
      now = new Date();
    }
    var past = new Date(date.text());
    var delta = (now-past)/1000;
    if(delta < 0){
      date.text('acum cateva secunde');
      return;
    }
    // Minutes
    if(delta < 120){
      date.text('acum un minut');
      return;
    }
    if(delta < 3300){
      var min = parseInt(delta/60, 10);
      date.text('acum ' + min + ' minute');
      return;
    }
    // Hours
    if(delta < 7200){
      date.text('acum o ora');
      return;
    }
    if(delta < 72000){
      var hours = parseInt(delta / 3600, 10);
      date.text('acum ' + hours + ' ore');
      return;
    }
    // Days
    delta = delta / 3600;
    if(delta < 48){
      date.text('ieri');
      return;
    }
    if(delta < 160){
      var days = parseInt(delta / 24, 10);
      date.text('acum ' + days + ' zile');
      return;
    }
    // Weeks
    if(delta < 336){
      date.text('saptamana trecuta');
      return;
    }
    if(delta < 720){
      var weeks = parseInt(delta/24/7, 10);
      date.text('acum ' + weeks + ' saptamani');
      return;
    }
    // Months
    delta = delta / 24;
    if(delta < 60){
      date.text('acum o luna');
      return;
    }
    if(delta < 360){
      var months = parseInt(delta/30, 10);
      date.text('acum ' + months + ' luni');
      return;
    }
    // Years
    if(delta < 720){
      date.text('acum un an');
      return;
    }
    if(delta>720){
      var years = parseInt(delta/360, 10);
      date.text('acum ' + years + ' ani');
    }
  };

  return this.each(function(){
    if(options){
      $.extend(settings, options);
    }

    var self = $(this);
    roformat(self);
  });
};

if(!window.Stiam){
  var Stiam = {version: '1.0'};
}

Stiam.Events = {
  query: 'stiam-query',
  app: 'stiam-app',
  reset: 'stiam-reset',
  refresh: 'stiam-refresh'
};

Stiam.Analytics = {

  initialize: function(){
    if(!window.isphone){
      return;
    }

    window.plugins.analytics.start("UA-10574661-4",
      function(){
        if(window.console){
          console.log('Analytics started');
        }
      },
      function(){
        if(window.console){
          console.log('Analytics failled');
        }
      }
    );
  },

  trackPage: function(page, query){
    if(!window.isphone){
      return;
    }

    page = '/mobile-app' + page;
    if(query){
      query = jQuery.param(query, traditional=true);
      query = query.replace('http://stiam.ro/', '').replace('http%3A%2F%2Fstiam.ro%2F', '');
      page += "?" + query;
    }

    window.plugins.analytics.trackPageView(page,
      function(){
        if(window.console){
          console.log('track: ' + page);
        }
      },
      function(){
        if(window.console){
          console.log('track fail: ' + page);
        }
      }
    );
  }
};

Stiam.Panel = function(context, options){
  var self = this;
  self.context = context;
  self.settings = {
    button: '',
    server: SERVER + '/revista-presei-romanesti/app.json?callback=?',
    categories: {},
    sources: {}
  };

  if(options){
    $.extend(self.settings, options);
  }

  return self.initialize();
};

Stiam.Panel.prototype = {
  initialize: function(){
    var self = this;
    self.changed = true;

    self.context.on( "panelclose", function(evt, ui){
      return self.query();
    });

    $(document).unbind('.StiamPanel');
    $(document).bind(Stiam.Events.reset + '.StiamPanel', function(evt, data){
      self.reset(data);
    });

    self.update();
  },

  query: function(){
    var self = this;
    if(!self.changed){
      return;
    }

    var form = $('form', self.context);
    var items = $(':checked', form);
    var count = items.length;
    self.settings.button.find('.ui-btn-text').text(count);

    var query = {};
    $.each(items, function(idx, item){
      var key = $(item).data('key');
      value = $(item).data('value');
      if(!query[key]){
        query[key] = [];
      }
      query[key].push(value);
    });

    Stiam.Storage.setQuery(query);
    $(document).trigger(Stiam.Events.query);
    self.changed = false;
  },

  update: function(){
    var self = this;
    $.mobile.showPageLoadingMsg();
    $.ajax({
      url: self.settings.server,
      dataType: 'jsonp',
      crossDomain: true,
      error: function(jqXHR, textStatus, errorThrown){
        self.error('Eroare. Va rugam verificati conexiunea la internet');
      },
      success: function(data, textStatus, jqXHR){
        $.extend(self.settings, data);
        self.updateSection(self.settings.sources);
        self.updateSection(self.settings.categories);
        self.reload();
      },
      complete: function(){
        $.mobile.hidePageLoadingMsg();
      }
    });
  },

  updateSection: function(section){
    var self = this;
    var cid = section.properties.name;
    if(!section.dataset){
      section.dataset = [];
    }

    var query = Stiam.Storage.getQuery();
    $.each(section.items, function(idx, value){
      section.dataset.push({
        name: cid + '--' + value,
        title: value,
        on: ($.inArray(value, query[cid] || []) !== -1)
      });
    });
  },

  reload: function(){
    var self = this;
    self.reloadSection(self.settings.sources, 'sources');
    self.reloadSection(self.settings.categories, 'categories');
    self.query();
  },

  reloadSection: function(section, sid){
    var self = this;
    var html;
    var dataset = section.dataset;
    var cid = section.properties.name;
    var fieldset = self.context.find('#' + sid);
    var legend = fieldset.find('legend');
    fieldset.empty();
    legend.appendTo(fieldset);
    $.each(dataset, function(idx, item){
      var checked = item.on ? "checked" : null;
      html = '<input type="checkbox" ';
      if(item.on){
        self.changed = true;
        html += 'checked="checked" ';
      }
      html += 'name="' + item.name + '" id="' + item.name + '" data-value="' + item.title +'" data-key="' + cid + '">';
      html += '<label for="' + item.name + '">' + item.title + '</label>';
      html = $(html);
      html.appendTo(fieldset);
    });

    self.context.find('input[type="checkbox"]').checkboxradio();

    self.context.find('form :input').on('change', function(){
      self.changed = true;
    });
  },

  reset: function(options){
    var self = this;
    var items = $('form :checked', self.context);
    items.attr('checked', false);
    items.checkboxradio('refresh');
    self.changed = true;
    self.context.trigger('panelclose');
  },

  error: function(message){
    $.mobile.showPageLoadingMsg('e', message);
  }
};

Stiam.Settings = function(context, options){
  var self = this;
  self.context = context;
  self.settings = {
    button: ''
  };

  if(options){
    $.extend(self.settings, options);
  }

  return self.initialize();
};

Stiam.Settings.prototype = {
  initialize: function(){
    var self = this;
    self.changed = [];

    // Theme
    $('[name="theme"]', self.context).change(function(){
      var theme = $(this).val();
      Stiam.Storage.setItem('theme', theme);
      self.theme(['theme']);
    });

    // Events
    self.context.on( "panelclose", function(evt, ui){
      var settings = $('form', self.context).serializeArray();
      $.each(settings, function(idx, item){
        var name = item.name;
        var value = item.value;
        if(Stiam.Storage.getItem(name) !== value){
          Stiam.Storage.setItem(name, value);
          self.changed.push(name);
        }
      });

      if(self.changed.length){
        $(document).trigger(Stiam.Events.refresh, {'changed': self.changed});
        self.changed = [];
      }
    });

    $(document).unbind('.StiamSettings');
    $(document).bind(Stiam.Events.refresh + '.StiamSettings', function(evt, data){
      var changed = data ? data.changed : [];
      self.theme(changed);
    });

    self.update();
    self.theme(['theme']);
  },

  update: function(){
    var self = this;

    // theme
    var value = Stiam.Storage.getItem('theme') || 'b';
    var input = $('[name="theme"]', self.context);
    input.val(value);
    input.selectmenu('refresh');

    // showImages
    value = Stiam.Storage.getItem('showImages') || 'on';
    input = $('[name="showImages"]', self.context);
    input.val(value);
    input.slider('refresh');

    // infiniteScroll
    value = Stiam.Storage.getItem('infiniteScroll') || 'on';
    input = $('[name="infiniteScroll"]', self.context);
    input.val(value);
    input.slider('refresh');

    // fontSize
    value = Stiam.Storage.getItem('fontSize') || 100;
    input = $('[name="fontSize"]', self.context);
    input.val(parseInt(value, 10));
    input.slider('refresh');

  },

  theme: function(changed){
    var self = this;

    // theme not changed, nothing to do
    if($.inArray('theme', changed) === -1){
      return;
    }

    var theme = Stiam.Storage.getItem('theme') || 'b';

    //reset all the buttons widgets
    $(document).find('.ui-btn')
           .removeClass('ui-btn-up-a ui-btn-up-b ui-btn-up-c ui-btn-up-d ui-btn-up-e ui-btn-hover-a ui-btn-hover-b ui-btn-hover-c ui-btn-hover-d ui-btn-hover-e')
           .addClass('ui-btn-up-' + theme)
           .attr('data-theme', theme);

    //reset the header/footer widgets
    $(document).find('.ui-header, .ui-footer')
            .removeClass('ui-bar-a ui-bar-b ui-bar-c ui-bar-d ui-bar-e')
            .addClass('ui-bar-' + theme)
            .attr('data-theme', theme);

    //reset the page widget
    $(document).find('.ui-panel')
            .removeClass('ui-body-a ui-body-b ui-body-c ui-body-d ui-body-e')
            .addClass('ui-body-' + theme)
            .attr('data-theme', theme);
  }
};

Stiam.Listing = function(context, options){
  var self = this;
  self.context = context;
  self.settings = {
    server: SERVER + '/revista-presei-romanesti/query.json?callback=?',
    dataset: [],
    properties: {}
  };

  if(options){
    $.extend(self.settings, options);
  }

  return self.initialize();
};

Stiam.Listing.prototype = {
  initialize: function(){
    var self = this;

    self.container = $('.container', self.context);
    self.container.masonry({
      itemSelector: '.article-brick'
    });

    // Events
    $(document).unbind('.StiamListing');
    $(document).bind(Stiam.Events.query + '.StiamListing', function(evt, data){
      var refresh = true;
      var query = Stiam.Storage.getQuery();
      if(query.b_start && query.b_start !== 0){
        refresh = false;
      }
      self.update(refresh);
    });

    $(document).bind(Stiam.Events.refresh + '.StiamListing', function(evt, data){
      var changed = data ? data.changed : [];
      self.refresh(changed);
    });
  },

  more: function(){
    var self = this;
    var more = $([
      '<div class="article-brick">',
      '<div class="article more-articles">',
        '<div class="article-body">',
          '<div class="article-inner">',
            '<button>Mai multe ştiri</button>',
          '</div>',
        '</div>',
      '</div>',
      '</div>'].join('\n'));
    more.appendTo(self.container);

    $('button', more).button();
    $('button', more).click(function(){
      // Prevent multiple clicks
      $(this).unbind('click');

      var query = Stiam.Storage.getQuery();
      if(!query.b_start){
        query.b_start = 20;
      }else{
        query.b_start += 20;
      }
      Stiam.Storage.setQuery(query);
      $(document).trigger(Stiam.Events.query);
      self.container.masonry('remove', more);
    });

    self.container.masonry('appended', more, true);
  },

  refresh: function(changed){
    var self = this;

    // showImages or fontSize changed
    if(($.inArray('showImages', changed) !== -1) || ($.inArray('fontSize', changed) !== -1)){
      $(document).trigger(Stiam.Events.query);
    }

  },

  update: function(refresh){
    var self = this;
    $.mobile.showPageLoadingMsg();
    $.ajax({
      url: self.settings.server,
      dataType: 'jsonp',
      crossDomain: true,
      traditional: true,
      data: Stiam.Storage.getQuery(),
      error: function(jqXHR, textStatus, errorThrown){
        self.error('Eroare. Va rugam verificati conexiunea la internet');
        alert('Eroare. Va rugam verificati conexiunea la internet');
      },
      success: function(data, textStatus, jqXHR){
        self.settings.dataset = data.items;
        self.settings.properties = data.properties;
        self.reload(refresh);
      },
      complete: function(){
        $.mobile.hidePageLoadingMsg();
      }
    });
  },

  reload: function(refresh){
    var self = this;

    // Analytics
    Stiam.Analytics.trackPage('/', Stiam.Storage.getQuery());

    if(refresh){
      self.container.empty();
    }

    $.each(self.settings.dataset, function(idx, item){
      var html ='<div class="article-brick"><a href="#article-page" class="article" data-transition="none">';
      if(item.thumbnail && Stiam.Storage.getItem('showImages') === 'on'){
        html += '<div class="article-thumb-container">';
        html += '<img class="article-thumb" src="' + item.thumbnail + '" />';
        html += '</div>';
      }
      html += '<div class="article-body"><div class="article-inner">';
      html += '<h3 class="documentFirstHeading" style="font-size:' + (parseInt(Stiam.Storage.getItem('fontSize'), 10) + 72) + '%">' + item.title + '</h3>';
      html += '<div class="documentByLine">';
      html += '<span>' + item.source + ' - </span>';
      html += '<span class="rodate">' + item.date + '</span>';
      html += '</div>';
      html += '<p class="documentDescription" style="font-size: ' + Stiam.Storage.getItem('fontSize') + '%;">' + item.description + '</p>';
      html += '</div></div>';
      html += '</a></div>';
      html = $(html);

      html.appendTo(self.container);

      html.click(function(){
        self.click($(this), item);
      });

      // XXX Bugous
      //html.on('swipeleft', function(){
        //self.click($(this), item);
      //});

      if(!refresh){
        self.container.masonry('appended', html, true);
      }
    });

    $('.rodate', self.context).rodate();

    // No results
    if(refresh && !self.settings.dataset.length){
      var html = $([
        '<div class="article-brick">',
          '<div class="article">',
            '<div class="article-body"><div class="article-inner">',
            '<h3 class="documentFirstHeading"  style="font-size:' + (parseInt(Stiam.Storage.getItem('fontSize'), 10) + 72) + '%">Nu exista articole care sa corespunda filtrelor selectate</h3>',
              '<button>Sterge toate filtrele</button>',
          "</div>",
        '</div>'
        ].join('\n'));
      html.appendTo(self.container);
      $('button', html).button();

      $('button', html).click(function(evt){
        $(document).trigger(Stiam.Events.reset);
      });

      self.container.masonry('appended', html, true);
    }else{
      self.more();
    }

    if(refresh){
      self.container.masonry('reload');
    }
  },

  error: function(message){
    $.mobile.showPageLoadingMsg('e', message);
  },

  click: function(context, options){
    var self = this;
    Stiam.Analytics.trackPage('/article-details/', {url: options.url});
    var body = $('#article-page').find('#article-details');
    body.empty();
    var html = "<div class='article'>";
    html += '<div class="article-body"><div class="article-inner">';
    html += '<h3 class="documentFirstHeading" style="font-size:' + (parseInt(Stiam.Storage.getItem('fontSize'), 10) + 72) + '%">' + options.title + '</h3>';
    html += '<div class="documentByLine">';
    html += '<a href="' + options.original+ '">' + options.source + '</a>';
    html += '<span> - </span><span class="rodate">' + options.date + '</span>';
    html += '</div>';

    if(options.thumbnail && Stiam.Storage.getItem('showImages') === 'on'){
      html += '<img class="article-thumb" src="' + options.thumbnail + '" />';
    }

    html += '<p class="documentDescription" style="font-size: ' + Stiam.Storage.getItem('fontSize') + '%">' + options.description + '</p>';
    html += '</div></div>';
    html += '<div class="details">';
    html += '<img class="loading" src="assets/css/images/ajax-loader-2.gif"/>';
    html += '</div></div>';
    html = $(html);

    html.find('a').click(function(evt){
      return self.external(evt, $(this));
    });

    html.appendTo(body);
    $('.rodate', body).rodate();
    self.details(body, options);
    self.theme(['theme']);

    // XXX Bugous
    //body.unbind('swiperight');
    //body.on('swiperight', function(){
      //var back = $('a[data-rel="back"]:visible');
      //if(back.length){
        //return back.click();
      //}
    //});

    // Share button
    var share = $('#article-page').find('[data-icon="star"]');
    if(!window.isphone){
      share.attr('target', '_blank');
      share.attr('href', options.url);
    }else{
      share.unbind('click');
      share.click(function(evt){
        evt.preventDefault();
        window.plugins.share.show({
          subject: options.title,
          text: options.url},
          function() {

          }, // Success function
          function() {
            alert('Share failed');
          } // Failure function
        );
      });
    }
  },

  details: function(context, options){
    var self = this;

    var index = options.url.lastIndexOf('/');
    var url = options.url.substr(0, index) + '/diffbot.json?callback=?';
    $.mobile.showPageLoadingMsg();
    $.ajax({
      url: url,
      data: {'url': options.original},
      dataType: 'jsonp',
      crossDomain: true,
      error: function(jqXHR, textStatus, errorThrown){
        self.error('Eroare. Va rugam verificati conexiunea la internet');
      },
      success: function(data, textStatus, jqXHR){
        if(data.error){
          self.error(data.error);
        }
        if(!data.text){
          return;
        }
        var text = data.text;
        text = text.replace(/\n/g, '</p><p>');
        var div = $('<div class="documentDetails" style="font-size: ' + Stiam.Storage.getItem('fontSize') + '%">');
        var a = $([
          '<div class="documentViewOriginal">',
            '<a href="' + options.original + '">Vezi articolul original</a>',
          '</div>'
        ].join(''));

        $(text).appendTo(div);
        var details = context.find('.details');
        details.html(div);

        a.appendTo(details);
        details.find('a').click(function(evt){
          return self.external(evt, $(this));
        });

      },
      complete: function(){
        $.mobile.hidePageLoadingMsg();
        self.theme(['theme']);
      }
    });
  },

  theme: function(changed){
    var self = this;

    // theme not changed, nothing to do
    if($.inArray('theme', changed) === -1){
      return;
    }

    var theme = Stiam.Storage.getItem('theme') || 'b';

    //reset all the buttons widgets
    $(document).find('.ui-btn')
           .removeClass('ui-btn-up-a ui-btn-up-b ui-btn-up-c ui-btn-up-d ui-btn-up-e ui-btn-hover-a ui-btn-hover-b ui-btn-hover-c ui-btn-hover-d ui-btn-hover-e')
           .addClass('ui-btn-up-' + theme)
           .attr('data-theme', theme);

    //reset the header/footer widgets
    $(document).find('.ui-header, .ui-footer')
            .removeClass('ui-bar-a ui-bar-b ui-bar-c ui-bar-d ui-bar-e')
            .addClass('ui-bar-' + theme)
            .attr('data-theme', theme);

    //reset the page widget
    $(document).find('.ui-panel')
            .removeClass('ui-body-a ui-body-b ui-body-c ui-body-d ui-body-e')
            .addClass('ui-body-' + theme)
            .attr('data-theme', theme);
  },

  external: function(evt, link){
    var self = this;
    var url = link.attr('href');
    if(window.isphone) {
      evt.preventDefault();
      navigator.app.loadUrl(url, {
        openExternal: true
      });
    }else{
      link.attr('target', '_blank');
    }
  }
};

Stiam.BackToTop = {
  initialize: function(){
    var self = this;
    self.button = $('<div>')
      .attr('id', 'back-top')
      .addClass('back-top')
      .html('sus')
      .hide()
      .appendTo($('body'));

    self.button.click(function(){
      $('body,html').animate({scrollTop: 0}, 800);
    });

    $(window).unbind('.StiamBackToTop');
    $(window).bind('scroll.StiamBackToTop', function () {
      if ($(this).scrollTop() > 100) {
        self.button.fadeIn('slow');
      } else {
        self.button.fadeOut('slow');
      }
    });
  }
};

Stiam.InfiniteScroll = {
  initialize: function(){
    var self = this;

    $(window).unbind('.StiamInfiniteScroll');
    $(window).bind('scroll.StiamInfiniteScroll', function(){

      if(Stiam.Storage.getItem('infiniteScroll') !== 'on'){
        return;
      }

      // XXX Use activePage ?
      var back = $('a[data-rel="back"]:visible');
      if(back.length){
        return;
      }

      var batch = $('.article-brick:has(".more-articles")');
      var batchTop = batch.position();
      batchTop = batchTop ? batchTop.top : 0;
      if(!batchTop){
        return;
      }

      var windowBottom = $(window).height() + $(window).scrollTop();

      // Not yet
      if((batchTop - windowBottom) > 300){
        return;
      }

      $('button', batch).click();

    });
  }
};

Stiam.Refresh = {
  initialize: function(){
    var self = this;
    self.button = $('a[data-icon="refresh"]');
    self.button.click(function(evt){
      evt.preventDefault();
      Stiam.Storage.settings.query.b_start = 0;
      $(document).trigger(Stiam.Events.query);
    });
  }
};

// Persistent Storage
Stiam.Storage = {
  settings: {
    showImages: 'on',
    infiniteScroll: 'on',
    theme: 'b',
    fontSize: 100,
    query: {}
  },

  initialize: function(callback){
    var self = this;
    self.db = null;
    self.localStorage = null;

    if(window.openDatabase){
      self.db = openDatabase('stiamro', '1.0', 'stiam.ro', 2 * 1024 * 1024);
    }

    if(window.Storage){
      self.localStorage = localStorage;
    }

    return self.reload(callback);
  },

  getQuery: function(){
    var self = this;
    return self.settings.query;
  },

  setQuery: function(query){
    var self = this;
    self.settings.query = query;

    // Don't persist batch queries
    var newQuery = jQuery.extend({}, query);
    newQuery.b_start = 0;
    newQuery = escape(JSON.stringify(newQuery));
    self.commit("query", newQuery);
  },

  setItem: function(key, value){
    var self = this;
    self.settings[key] = value;
    self.commit(key, value);
  },

  getItem: function(key){
    var self = this;
    return self.settings[key];
  },

  reload: function(callback){
    var self = this;
    if(!self.db){
      return self.reloadFromLocalStorage(callback);
    }

    var error = function(err){
      return callback();
    };

    var success = function(tx, results){
      if(results && results.rows && results.rows.length){
        var rows = results.rows;
        for(i=0;i<results.rows.length;i++){
          var item = rows.item(i);
          if(item.name == "query"){
            value = JSON.parse(unescape(item.value));
          }else{
            value = item.value;
          }
          self.settings[item.name] = value;
        }
      }
      return callback();
    };

    var sql = function(tx){
      tx.executeSql('CREATE TABLE IF NOT EXISTS SETTINGS (name unique, value)');
      tx.executeSql('SELECT * FROM SETTINGS', [], success, error);
    };

    self.db.transaction(sql, error);
  },

  commit: function(key, value){
    var self = this;
    if(!self.db){
      return self.commitInLocalStorage(key, value);
    }

    var sql = function(tx){
      tx.executeSql('CREATE TABLE IF NOT EXISTS SETTINGS (name unique, value)');
      tx.executeSql('INSERT OR REPLACE INTO SETTINGS (name, value) VALUES ("' + key + '", "'+ value +'")');
    };

    var error = function(err){
      if(window.console){
        console.log(err);
      }
    };

    self.db.transaction(sql, error);
  },

  reloadFromLocalStorage: function(callback){
    var self = this;
    if(!self.localStorage){
      return callback();
    }

    $.each(self.settings, function(key, old){
      var value = self.localStorage.getItem(key);
      if(key == "query"){
        value = JSON.parse(unescape(value));
      }
      if(value){
        self.settings[key] = value;
      }
    });

    return callback();
  },

  commitInLocalStorage: function(key, value){
    var self = this;
    if(self.localStorage){
      self.localStorage.setItem(key, value);
    }
  }
};

Stiam.initialize = function(){
  var context;

  // Events
  $( document ).unbind('.Stiam');
  $( document ).on( "swipeleft.Stiam swiperight.Stiam", "#header", function( e ) {
    if ( $.mobile.activePage.jqmData( "panel" ) !== "open" ) {
      if ( e.type === "swipeleft"  ) {
        $( "#right-panel" ).panel( "open" );
      } else if ( e.type === "swiperight" ) {
        $( "#left-panel" ).panel( "open" );
      }
    }
  });

  // Left panel
  context = $("#left-panel");
  var left = new Stiam.Panel(context, {
    button: $('a[href="#left-panel"]')
  });
  context.data('Stiam.Panel', left);

  // Right panel
  context = $('#right-panel');
  var right = new Stiam.Settings(context, {
    button: $('a[href="#right-panel"]')
  });
  context.data('Stiam.Settings', right);

  // Listing
  context = $('#body');
  var center = new Stiam.Listing(context, {});
  context.data('Stiam.Listing', center);

  // Buttons
  Stiam.InfiniteScroll.initialize();
  Stiam.BackToTop.initialize();
  Stiam.Refresh.initialize();

  $.mobile.page.prototype.options.backBtnTheme = "c";

  // Device back button
  window.backs = 0;
  $(document).on("backbutton.Stiam", function (){
    // Don't try to exit if the user is not on the homepage
    var back = $('a[data-rel="back"]:visible');
    if(back.length){
      return back.click();
    }

    if ( $.mobile.activePage.jqmData( "panel" ) === "open" ) {
      $('#right-panel').panel('close');
      $('#left-panel').panel('close');
      return;
    }

    window.backs += 1;
    $.mobile.showPageLoadingMsg('a', "Mai apasă odată pentru a ieşi", true);
    if(window.backs > 1){
      navigator.app.exitApp();
    }

    setTimeout(function(){
      window.backs = 0;
      $.mobile.hidePageLoadingMsg();
    }, 3000);

  });

  // Device menu button
  $(document).on("menubutton.Stiam", function (){
    $('#right-panel').panel('toggle');
  });

  // Device search button
  $(document).on("searchbutton.Stiam", function (){
    $('#left-panel').panel('toggle');
  });

  // Google Analytics
  Stiam.Analytics.initialize();
};

$( document ).on( "pageinit", "#main-page", function() {
    // are we running in native app or in browser?
    $('[data-role="page"]').removeAttr('style');

    window.isphone = false;
    if(document.URL.indexOf("http://") == -1) {
        window.isphone = true;
    }

    if(window.isphone) {
      $(document).on("deviceready", function(){
        navigator.splashscreen.hide();
        Stiam.Storage.initialize(Stiam.initialize);
      });
    } else {
        Stiam.Storage.initialize(Stiam.initialize);
    }
});
