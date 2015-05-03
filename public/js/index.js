$(function() {
    $("#search").slideDown(1000, function() {
        
    });

    $("form").submit(function(e) {
        e.preventDefault();

        // Change style and text of submit button
        $("#submit").addClass("btn-warning");
        $("#submit").removeClass("btn-success");
        $("#submit").html("Searching...<span class=\"glyphicon glyphicon-refresh glyphicon-refresh-animate\"></span>");

        var query = $("#query").val();

        $.post("/", {
            query: query,
        }, function (data) {
            // Successful
            if (data.status == "valid") {
                // Display results
            // Failed
            } else {
                // Display Error
            }
        });
    });
});