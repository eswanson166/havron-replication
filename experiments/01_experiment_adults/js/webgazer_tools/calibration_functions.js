// MINORLY ADAPTED FROM WEBGAZER'S CALIBRATION.JS FILE (https://webgazer.cs.brown.edu/)

var PointCalibrate = 0;
var CalibrationPoints={};
var precision_measurement = 0 ; //global so i can use it in main exp logic js

// UX //
function helpModalShow() {
    $('#helpModal').modal('show');
}

/**
 * Show the Calibration Points
 */
function ShowCalibrationPoint() {
  $(".Calibration").show();
  $("#Pt5").hide(); // initially hides the middle button
}


function PopUpInstruction(){
  ClearCanvas();
  swal({
    title:"Calibration",
    text: "Merci de cliquer sur chacun des 9 points sur votre écran. Vous devez cliquer chaque point 5 fois jusqu’à ce que la couleur devienne jaune. Cela calibrera vos mouvements oculaires.",
    buttons:{
      cancel: false,
      confirm: true
    }
  }).then(isConfirm => {
    ShowCalibrationPoint();
  });

}


function ClearCalibration(){
  window.localStorage.clear();
  $(".Calibration").css('background-color','red');
  $(".Calibration").css('opacity',0.2);
  $(".Calibration").prop('disabled',false);

  CalibrationPoints = {};
  PointCalibrate = 0;
}

function ClearCanvas(){
  $(".Calibration").hide();
  var canvas = document.getElementById("plotting_canvas");
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}



function doCalibration(){
     $(".Calibration").click(function(){ // click event on the calibration buttons

      var id = $(this).attr('id');

      if (!CalibrationPoints[id]){ // initialises if not done
        CalibrationPoints[id]=0;
      }
      CalibrationPoints[id]++; // increments values

      if (CalibrationPoints[id]==5){ //only turn to yellow after 5 clicks
        $(this).css('background-color','yellow');
        $(this).prop('disabled', true); //disables the button
        PointCalibrate++;
      }else if (CalibrationPoints[id]<5){
        //Gradually increase the opacity of calibration points when click to give some indication to user.
        var opacity = 0.2*CalibrationPoints[id]+0.2;
        $(this).css('opacity',opacity);
      }

      //Show the middle calibration point after all other points have been clicked.
      if (PointCalibrate == 8){
        $("#Pt5").show();
      }

      if (PointCalibrate >= 9){ // last point is calibrated
            //using jquery to grab every element in Calibration class and hide them except the middle point.
            $(".Calibration").hide();
            $("#Pt5").show();

            // clears the canvas
            var canvas = document.getElementById("plotting_canvas");
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            // notification for the measurement process
            swal({
              title: "Calculation des mesures",
              text: "Merci de ne pas bouger votre souris et de regarder vers le point central pour les 5 prochaines secondes. Cela nous permettra de calculer la précision de nos prédictions.",
              closeOnEsc: false,
              allowOutsideClick: false,
              closeModal: true
            }).then( isConfirm => {

                // makes the variables true for 5 seconds & plots the points
                $(document).ready(function(){

                  store_points_variable(); // start storing the prediction points

                  sleep(5000).then(() => {
                      stop_storing_points_variable(); // stop storing the prediction points
                      var past50 = get_points() // retrieve the stored points
                      precision_measurement = calculatePrecision(past50);
                      // var precision_measurement = calculatePrecision(past50);
                      var accuracyLabel = "<a>Précision | "+precision_measurement+"%</a>";
                      $("#begin_task").show();
                      document.getElementById("Accuracy").innerHTML = accuracyLabel; // Show the accuracy in the nav bar.
                      swal({
                        title: "Votre mesure de précision est: " + precision_measurement + "%",
                        allowOutsideClick: false,
                        buttons: {
                          cancel: "Calibrer à nouveau",
                          confirm: true,
                        }
                      }).then(isConfirm => {
                          if (isConfirm){
                            //clear the calibration & hide the last middle button
                            ClearCanvas();
                          } else {
                            //use restart function to restart the calibration
                            ClearCalibration();
                            ClearCanvas();
                            ShowCalibrationPoint();

                          }
                      });
                  });
                });
            });
          }
    });
}
