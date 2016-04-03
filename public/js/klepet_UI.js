function divElementEnostavniTekst(sporocilo) {
  sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/&lt;img/g, '<img').replace(/png\' \/&gt;/g, 'png\' />');
  sporocilo = dodajSlike(sporocilo);
  return $('<div style="font-weight: bold"></div>').html(sporocilo);
}

function divElementHtmlTekst(sporocilo) {
  sporocilo = dodajSlike(sporocilo);
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  };
  for (var smesko in preslikovalnaTabela) {
    while (vhodnoBesedilo.indexOf(smesko) > -1) {
      vhodnoBesedilo = vhodnoBesedilo.replace(smesko, 
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
    }
  }
  return vhodnoBesedilo;
}

function dodajSlike(sporocilo) {
  var besede = sporocilo.split(" ");
  var povezavaDoSmeskov = "http://sandbox.lavbic.net/teaching/OIS/gradivo/";
  for (var i = 0; i < besede.length; i++) {
    var povezava = true, sprememba = false;
    var zacetek = 0, konec = 0;
    while (povezava) {
      povezava = false;
      var tp = besede[i].indexOf('http://', konec), tps = besede[i].indexOf('https://', konec);
      var jp = besede[i].indexOf('.jpg', konec), pn = besede[i].indexOf('.png', konec), gi = besede[i].indexOf('.gif', konec);
      if (tp > -1 && (tps < 0 || tp < tps)) {
        zacetek = tp;
        sprememba = true;
      } else if (tps > -1) {
        zacetek = tps;
        sprememba = true;
      }
      if (jp > -1 && (pn < 0 || jp < pn) && (gi < 0 || jp < gi)) {
        konec = jp + 4;
        sprememba = true;
      } else if (pn > -1 && (gi < 0 || pn < gi)) {
        konec = pn + 4;
        sprememba = true;
      } else if (gi > -1) {
        konec = gi + 4;
        sprememba = true;
      }
      if (zacetek > -1 && konec > -1 && konec > zacetek && sprememba) {
        povezava = true;
        if (besede[i].substring(zacetek, konec).substr(0, povezavaDoSmeskov.length) != povezavaDoSmeskov) {
          besede[i] = besede[i].substring(0, zacetek) + '<div class="media"><img src="' +
          besede[i].substring(zacetek, konec) + '"></div>' +
          besede[i].substring(konec, besede[i].length);
          konec += 37; // 37 - dolzina niza '<div class="media"><img src=""></div>'
        }
      }
      sprememba = false;
    }
  }
  sporocilo = besede.join(" ");
  return sporocilo;
}
