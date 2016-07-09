
var pco = (function() {
  'use strict';

  var access_token;

  var tokenFetcher = (function() {
    var clientId = '96ab17a7cffbfb8c22afd98e606fb10db2276629d150b74732af20a3ca4e4465';
    var clientSecret = '46255d3772a00b623cebd10279be056c4fcbed32b624479648eff5a4f51201a6';
    var redirectUri = 'https://' + chrome.runtime.id + '.chromiumapp.org/pco';
    var redirectRe = new RegExp(redirectUri + '[#\?](.*)');
    access_token = null;

    return {
      getToken: function(interactive, callback) {

        // In case we already have an access_token cached, simply return it.
        if (access_token) {
          callback(null, access_token);
          return;
        }

        var options = {
          'interactive': interactive,
          'url': 'https://api.planningcenteronline.com/oauth/authorize?client_id='+clientId+'&scope=services&response_type=code&redirect_uri='+encodeURIComponent(redirectUri)
        }
        chrome.identity.launchWebAuthFlow(options, function(redirectUri) {
          if (chrome.runtime.lastError) {
            callback(new Error(chrome.runtime.lastError));
            return;
          }

          // Upon success the response is appended to redirectUri, e.g.
          // https://{app_id}.chromiumapp.org/pco#access_token={value}
          //     &refresh_token={value}
          // or:
          // https://{app_id}.chromiumapp.org/pco#code={value}
          var matches = redirectUri.match(redirectRe);
          if (matches && matches.length > 1)
            handleProviderResponse(parseRedirectFragment(matches[1]));
          else
            callback(new Error('Invalid redirect URI'));
        });

        function parseRedirectFragment(fragment) {
          var pairs = fragment.split(/&/);
          var values = {};

          pairs.forEach(function(pair) {
            var nameval = pair.split(/=/);
            values[nameval[0]] = nameval[1];
          });

          return values;
        }

        function handleProviderResponse(values) {
          if (values.hasOwnProperty('access_token'))
            setAccessToken(values.access_token);
          else if (values.hasOwnProperty('code'))
            exchangeCodeForToken(values.code);
          else callback(new Error('Neither access_token nor code avialable.'));
        }

        function exchangeCodeForToken(code) {
          var xhr = new XMLHttpRequest();
          xhr.open('POST',
                   'https://api.planningcenteronline.com/oauth/token?' +
                   'grant_type=authorization_code' +
                   '&client_id=' + clientId +
                   '&client_secret=' + clientSecret +
                   '&redirect_uri=' + encodeURIComponent(redirectUri) +
                   '&code=' + code);
          xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.onload = function () {
            if (this.status === 200) {
              var response = JSON.parse(this.responseText);
              setAccessToken(response.access_token);
              access_token = response.access_token;
            }
          };
          xhr.send();
        }

        function setAccessToken(token) {
          access_token = token;
          callback(null, access_token);
        }
      },

      removeCachedToken: function(token_to_remove) {
        if (access_token == token_to_remove)
          access_token = null;
      }
    }
  })();

  function xhrWithAuth(method, url, interactive, callback) {
    var retry = true;
    getToken();

    function getToken() {
      tokenFetcher.getToken(interactive, function(error, token) {
        if (error) {
          callback(error);
          return;
        }
        access_token = token;
        requestStart();
      });
    }

    function requestStart() {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url);
      xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
      xhr.onload = requestComplete;
      xhr.send();
    }

    function requestComplete() {
      if (this.status != 200 && retry) {
        retry = false;
        tokenFetcher.removeCachedToken(access_token);
        access_token = null;
        getToken();
      } else {
        callback(null, this.status, this.response);
      }
    }
  }

  function getSongList(interactive, offset) {
    xhrWithAuth('GET',
                'https://api.planningcenteronline.com/services/v2/songs?sort=title&per_page=100&offset='+offset+'&'+access_token,
                interactive,
                onSongListFetched);
  }


  function getArrangements(interactive, songid) {
    xhrWithAuth('GET',
                'https://api.planningcenteronline.com/services/v2/songs/'+songid+'/arrangements',
                interactive,
                onArrangementsFetched);
  }


  function onSongListFetched(error, status, response) {
    if (!error && status == 200) {
      var data = JSON.parse(response);
      
      $.each(data.data, function (i, val) {
        $('#song-list').append('<option class="song-title-option" data-songid="'+val.id+'">'+val.attributes.title+'</button>');
      });

      if(data.meta.next) {
        getSongList(true, data.meta.next.offset)
      } else {
        $('.song-title-option').on('click', function() {
          // $('.list-group-item.active').removeClass('active');
          // $(this).toggleClass('active');
          getArrangements(true, $(this).data('songid'));
        })
      }

    } else {
      console.log(error);
    }
  }


  function onArrangementsFetched(error, status, response) {
    if (!error && status == 200) {
      var data = JSON.parse(response);
      $('#song-chart').text(data.data[0].attributes.chord_chart);
      $('#song-link').attr('href', 'https://services.planningcenteronline.com/songs/'+data.meta.parent.id+'/arrangements/'+data.data[0].id);
    } else {
      console.log(error);
    }
  }


  function interactiveSignIn() {
    tokenFetcher.getToken(true, function(error, access_token) {
      if (error) {
        console.log(error);
      } else {
        getSongList(true, 0);
      }
    });
  }

  return {
    onload: function () {
      interactiveSignIn();
    }
  };
})();

window.onload = pco.onload;