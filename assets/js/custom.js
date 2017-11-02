// Wait for the document to be ready
$(document).ready(function(){
  // Make all external links open in a new tab
  $.expr[':'].external = function(obj){
    return !obj.href.match(/^mailto\:/)
           && (obj.hostname != location.hostname)
           && !obj.href.match(/^javascript\:/)
           && !obj.href.match(/^$/)
  };

  $('a:external').attr('target', '_blank');
});
