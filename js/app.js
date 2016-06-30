$( document ).ready(function() { 

  get_songs(0);

  function get_songs(offset) {
    console.log('get songs');

    console.log(chrome.identity.getRedirectURL('pco'));

    chrome.identity.launchWebAuthFlow(
      {
        'url': 'https://api.planningcenteronline.com?client_id=96ab17a7cffbfb8c22afd98e606fb10db2276629d150b74732af20a3ca4e4465&scope=services&response_type=token&redirect_uri='+chrome.identity.getRedirectURL('pco'), 
        'interactive': true
      },
      function(redirect_url) { 
        console.log(redirect_url);
      }
    );


    /*var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://api.planningcenteronline.com/services/v2/songs", true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        // JSON.parse does not evaluate the attacker's scripts.
        var resp = JSON.parse(xhr.responseText);
        console.log(resp);
      }
    }
    xhr.send();*/

    /*$.ajax({
      url: "pco.cfc",
      method: "GET",
      data: {method:'song_list', offset:offset},
      dataType: 'json'
    })
    .done(function( data ) {
      $.each(data.data, function (i, val) {
        $('#song-list').append('<option class="song-title-option" data-songid="'+val.id+'">'+val.attributes.title+'</button>');
      });

      if(data.meta.next) {
        get_songs(data.meta.next.offset)
        console.log(data.meta);
      } else {
        $('.song-title-option').on('click', function() {
          // $('.list-group-item.active').removeClass('active');
          // $(this).toggleClass('active');
          get_arrangements($(this).data('songid'));
        })
      }
    });*/
  }

  function get_arrangements(songid) {
    $.ajax({
      url: "pco.cfc",
      data: {method:'song_arrangements', songid:songid},
      method: "GET",
      dataType: 'json'
    })
    .done(function( data ) {
      $('#song-chart').text(data.data[0].attributes.chord_chart);
      $('#song-link').attr('href', 'https://services.planningcenteronline.com/songs/'+songid+'/arrangements/'+data.data[0].id);
    });
  }


});