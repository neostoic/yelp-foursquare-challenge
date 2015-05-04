$(function() {
    var searched = false;

    // Slide down at start
    $("#search").slideDown(1000);

    // Timer to prevent updates of every character
    var typingTimer;
    var doneTypingInterval = 500;

    $('#query').keyup(function() {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(doneTyping, doneTypingInterval);
    });

    $('#query').keydown(function() {
        $("#results").hide();
        clearTimeout(typingTimer);
    });

    // Retrieve results from combo db
    function doneTyping() {
        // Move search bar to top
        $('#loading').toggle();

        $.ajax({
            type: 'POST',
            url: '/',
            data: {
                query: $('#query').val()      
            },
            success: function (data) {

                // Hide loading symbol
                $('#loading').toggle();

                // Clear all table values
                $('#yelpTable tbody').remove();
                $('#comboTable tbody').remove();
                $('#foursquareTable tbody').remove();

                // Yelp
                $.each(data.yelp, function(key, value) {
                    $('#yelpTable').append('<tr><td>' + (key+1) + '</td><td>' + value.phone + '</td><td>' + value.zip + '</td></tr>');
                });

                // Combo
                $.each(data.combo, function(key, value) {
                    $('#comboTable').append('<tr><td>' + (key+1) + '</td><td>' + value.phone + '</td><td>' + value.zip + '</td><td><a href="http://map.what3words.com/' + value.threeWords + '" target="_blank">' + value.threeWords + '</a></td></tr>');
                });

                // Foursquare
                $.each(data.foursquare, function(key, value) {
                    $('#foursquareTable').append('<tr><td>' + (key+1) + '</td><td>' + value.phone + '</td><td>' + value.zip + '</td></tr>');
                });

                $("#results").show();
            }
        });
    };

});