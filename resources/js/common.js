$(function () {
  const emptyInputMsg = "Paste JSON here";
  const emptyOutputMsg = "NestJS DTO will appear here";
  const formattedEmptyInputMsg = '<span style="color: #777;">' + emptyInputMsg + '</span>';
  const formattedEmptyOutputMsg = '<span style="color: #777;">' + emptyOutputMsg + '</span>';

  function doConversion() {
    var input = $('#input').text().trim();
    if (!input || input == emptyInputMsg) {
      $('#output').html(formattedEmptyOutputMsg);
      return;
    }

    let output = jsonToNest(input, !$('#inline').is(':checked') ? 'interface' : 'class');

    if (output.error) {
      $('#output').html('<span class="clr-red">' + output.error + '</span>');
      var parsedError = output.error.match(/Unexpected token .+ in JSON at position (\d+)/);
      if (parsedError) {
        try {
          var faultyIndex = parsedError.length == 2 && parsedError[1] && parseInt(parsedError[1]);
          faultyIndex && $('#output').html(constructJSONErrorHTML(output.error, faultyIndex, input));
        } catch (e) {}
      }
    } else {
      var coloredOutput = hljs.highlight("js", output.content);
      $('#output').html(coloredOutput.value);
    }
  }

  // Hides placeholder text
  $('#input').on('focus', function () {
    var val = $(this).text();
    if (!val) {
      $(this).html(formattedEmptyInputMsg);
      $('#output').html(formattedEmptyOutputMsg);
    } else if (val == emptyInputMsg)
      $(this).html("");
  });

  // Shows placeholder text
  $('#input').on('blur', function () {
    var val = $(this).text();
    if (!val) {
      $(this).html(formattedEmptyInputMsg);
      $('#output').html(formattedEmptyOutputMsg);
    }
  }).blur();

  // If tab is pressed, insert a tab instead of focusing on next element
  $('#input').keydown(function (e) {
    if (e.keyCode == 9) {
      document.execCommand('insertHTML', false, '&#009'); // insert tab
      e.preventDefault(); // don't go to next element
    }
  });

  // Automatically do the conversion on paste or change
  $('#input').keyup(function () {
    doConversion();
  });

  // Also do conversion when inlining preference changes
  $('#inline').change(function () {
    doConversion();
  })

  // Highlights the output for the user
  $('#output').click(function () {
    if (document.selection) {
      var range = document.body.createTextRange();
      range.moveToElementText(this);
      range.select();
    } else if (window.getSelection) {
      var range = document.createRange();
      range.selectNode(this);
      var sel = window.getSelection();
      sel.removeAllRanges(); // required as of Chrome 60: https://www.chromestatus.com/features/6680566019653632
      sel.addRange(range);
    }
  });

  // Fill in sample JSON if the user wants to see an example
  // $('#sample1').click(function () {
  //   $('#input').text(stringify(sampleJson1)).keyup();
  // });
  // $('#sample2').click(function () {
  //   $('#input').text(stringify(sampleJson2)).keyup();
  // });

  var dark = false;
  $("#dark").click(function () {
    if (!dark) {
      $("head").append("<link rel='stylesheet' href='resources/css/dark.css' id='dark-css'>");
      $("#dark").html("Light mode");
    } else {
      $("#dark-css").remove();
      $("#dark").html("Dark mode");
    }
    dark = !dark;
  });

  // Copy contents of the output to clipboard
  $("#copy-btn").click(function () {
    var elm = document.getElementById("output");

    if (document.body.createTextRange) {
      // for ie
      var range = document.body.createTextRange();

      range.moveToElementText(elm);
      range.select();

      document.execCommand("Copy");
    } else if (window.getSelection) {
      // other browsers
      var selection = window.getSelection();
      var range = document.createRange();

      range.selectNodeContents(elm);
      selection.removeAllRanges();
      selection.addRange(range);

      document.execCommand("Copy");
    }
  })
});

function constructJSONErrorHTML(rawErrorMessage, errorIndex, json) {
  var errorHeading = '<p><span class="clr-red">' + rawErrorMessage + '</span><p>';
  var markedPart = '<span class="json-go-faulty-char">' + json[errorIndex] + '</span>';
  var markedJsonString = [json.slice(0, errorIndex), markedPart, json.slice(errorIndex + 1)].join('');
  var jsonStringLines = markedJsonString.split(/\n/);
  for (var i = 0; i < jsonStringLines.length; i++) {

    if (jsonStringLines[i].indexOf('<span class="json-go-faulty-char">') > -1) // faulty line
      var wrappedLine = '<div class="faulty-line">' + jsonStringLines[i] + '</div>';
    else
      var wrappedLine = '<div>' + jsonStringLines[i] + '</div>';

    jsonStringLines[i] = wrappedLine;
  }
  return (errorHeading + jsonStringLines.join(''));
}

// Stringifies JSON in the preferred manner
function stringify(json) {
  return JSON.stringify(json, null, "\t");
}
