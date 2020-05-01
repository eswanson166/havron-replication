
function make_slides(f) {
  var   slides = {};

  slides.i0 = slide({
    name : "i0",
    exp_start: function() {
    }
  });

  slides.training_and_calibration = slide({
    name: "training_and_calibration",
    start_camera : function(e) {
      $("#start_camera").hide();
      $("#start_calibration").show();
      init_webgazer();
    },

    finish_calibration_start_task : function(e){
      if (precision_measurement > PRECISION_CUTOFF){
        $("#plotting_canvas").hide();
        $("#webgazerVideoFeed").hide();
        $("#webgazerFaceOverlay").hide();
        $("#webgazerFaceFeedbackBox").hide();
        webgazer.pause();
        exp.go();
      }
      else {
        exp.accuracy_attempts.push(precision_measurement);
        swal({
          title:"Calibration Fail",
          text: "Either you haven't performed the calibration yet, or your calibration score is too low. Your calibration score must be 50% to begin the task. Please click Recalibrate to try calibrating again.",
          buttons:{
            cancel: false,
            confirm: true
          }
        })
      }
    }

  });

  slides.sound_test = slide({
    name: "sound_test",
    soundtest_OK : function(e){
      exp.trial_no = 0;
      exp.go();
    }
  });

  slides.single_trial = slide({
    name: "single_trial",
    present: exp.descriptors,
    present_handle: function(descriptor) {
      this.trial_start = Date.now();
      exp.trial_no += 1;
      $("#aud").hide();
      descriptor_name = descriptor.item
      exp.display_vids(); // get imgs, show them

      // get data from webgazer
      webgazer.resume();
      webgazer.setGazeListener(function(data, elapsedTime) {
        if (data == null) {
          return;
        }
        var xprediction = data.x; //these x coordinates are relative to the viewport
        var yprediction = data.y; //these y coordinates are relative to the viewport
        exp.tlist.push(elapsedTime);
        exp.xlist.push(xprediction);
        exp.ylist.push(yprediction);
      });

      $("#imgwrapper").show();
      $("#continue_button").hide();
      $("#next_button").hide();
      $(".err").hide();
      $(".err_part2").hide();
    },

    next_trial : function(e){
      if (exp.clicked == null ) {
        $(".err").show();
      } else {
        $(".err").hide();
        exp.keep_going = false;
        this.log_responses();
        _stream.apply(this);
        exp.tlist = [];
        exp.xlist = [];
        exp.ylist = [];
        exp.clicked = null;
        exp.endPreview = false;
      }
    },

    continue : function(e){
      exp.endPreview = true
      exp.endPreviewTime = Date.now()
      $("#vid_table tr").show();
      $("#continue_button").hide();
      var aud = $("#aud").attr("src", 'static/audio/wav/'+descriptor_name+".wav")[0];
      // get audio duration:
      aud.onloadedmetadata = function() {
        aud_dur = aud.duration;
      };
      },

    log_responses : function (){
      exp.data_trials.push({
        "descriptor" : descriptor_name,
        "selected_img" : exp.clicked,
        'left_choice' : vid_fnames[descriptor_name][0],
        'right_choice' : vid_fnames[descriptor_name][1],
        "start_time" : _s.trial_start,
        "rt" : Date.now() - _s.trial_start,
        "current_windowW" : window.innerWidth,
        "current_windowH" : window.innerHeight,
        "endPreviewTime" : exp.endPreviewTime,
        "aud_duration" : aud_dur,
        "trial_no" : exp.trial_no,
        'time' : exp.tlist,
        'x' : exp.xlist,
        'y': exp.ylist
      });
    }

  });

  slides.subj_info =  slide({
    name : "subj_info",
    submit : function(e){
      lg = $("#language").val();
      age = $("#participantage").val();
      gend = $("#gender").val();
      eyesight = $("#eyesight").val();
      eyesight_task = $("#eyesight_task").val();
      if(lg == '' || age == '' || gend == '' || eyesight == '-1' || eyesight_task == '-1'){
        $(".err_part2").show();
      } else {
        $(".err_part2").hide();
        exp.subj_data = {
          language : $("#language").val(),
          age : $("#participantage").val(),
          gender : $("#gender").val(),
          eyesight : $("#eyesight").val(),
          eyesight_task : $("#eyesight_task").val(),
          comments : $("#comments").val(),
          accuracy : precision_measurement,
          previous_accuracy_attempts : exp.accuracy_attempts,
          time_in_minutes : (Date.now() - exp.startT)/60000
        };
        exp.go();
      }
    }
  });

  slides.thanks = slide({
    name : "thanks",
    start : function() {
      webgazer.stopVideo();
      exp.data= {
        "trials" : exp.data_trials,
        "system" : exp.system,
        "subject_information" : exp.subj_data,
      };
      console.log(turk);
      setTimeout(function() {turk.submit(exp.data);}, 1000);
    }
  });

  return slides;
}


/// init ///
function init_explogic() {

  //Experiment constants
  PRECISION_CUTOFF = 50;
  NUM_COLS = 2;
  MIN_WINDOW_WIDTH = 1280;
  BUTTON_HEIGHT = 30;
  CTE_BUTTON_WIDTH = 100;
  NXT_BUTTON_WIDTH = 50;
  IMG_HEIGHT = 226;
  IMG_WIDTH = 400;

  //Initialize data frames
  exp.accuracy_attempts = [];
  exp.data_trials = [];
  exp.tlist = []; //TESTING
  exp.xlist = [];
  exp.ylist = [];
  exp.clicked = null
  exp.descriptors = _.shuffle(descriptors)   // shuffle list of descriptors

  //create experiment order/make slides
  exp.structure=[/*"i0",  "training_and_calibration", "sound_test", */"single_trial",  "subj_info", "thanks"];
  exp.slides = make_slides(exp);
  exp.nQs = utils.get_exp_length();

  exp.system = {
    Browser : BrowserDetect.browser,
    OS : BrowserDetect.OS,
    screenH: screen.height,
    screenW: screen.width,
    windowH: window.innerHeight,
    windowW: window.innerWidth,
    imageH: IMG_HEIGHT,
    imageW: IMG_WIDTH
  };


  // EXPERIMENT FUNCTIONS
  exp.display_vids = function(){
    if (document.getElementById("vid_table") != null){
      $("#vid_table tr").remove();
    }
    var table = document.createElement("table");
    var tr = document.createElement('tr');

    var cellwidth = MIN_WINDOW_WIDTH/NUM_COLS
    $("#continue_button").offset({top: (window.innerHeight/2)-(BUTTON_HEIGHT/2), left: (window.innerWidth/2)-(CTE_BUTTON_WIDTH/2)})
    $("#next_button").offset({top: (window.innerHeight/2)-(BUTTON_HEIGHT/2), left: (window.innerWidth/2)-(NXT_BUTTON_WIDTH/2)})

    // DO THIS WITH PREVIEW VIDEOS, THEN ACTUAL VIDEOS.
    // create table with img elements on L and R side. show these for 2 seconds (as a 'preview') and then show the Continue button to play audio
    for (i = 0; i < NUM_COLS; i++) {
      var vid_td = document.createElement('td');
      vid_td.style.width = cellwidth+'px';

      var vid_fname = vid_fnames[descriptor_name][i]
      var vid_pre = document.createElement('video');
      vid_pre.src = 'static/videos/preview_'+vid_fname+'.mov';
      vid_pre.id = vid_fname;
      console.log(vid_pre.id);
      vid_pre.autoplay = true
      //vid_pre.muted = true
      vid_pre.height = IMG_HEIGHT;
      vid_pre.width = IMG_WIDTH;


      // place images at L and R
      if (vid_pre.id == vid_fnames[descriptor_name][0]){
        vid_pre.style.marginRight = (cellwidth - IMG_WIDTH)  + 'px';
      } else {
        vid_pre.style.marginLeft = (cellwidth - IMG_WIDTH)  + 'px';
        console.log('vid_pre.style.marginLeft = ' + vid_pre.style.marginLeft)
      }

      // hide 2nd preview video
    if (i == 1){
      vid_pre.style.visibility = 'hidden';
    }
    /*
    if (i == 0) {
      vid_pre.addEventListener('ended', function(){
        vid_pre.hide();
      }
    }

    /*vid_pre.addEventListener('ended', function(){
      if (i == 1){
        vid.pre.style.visibility = 'visible';
      }
    }



      // after 1st preview video finishes playing, play 2nd preview video
      /*if (i == 0){
        vid_pre.addEventListener('ended', function(){
          if (i == 1){
            vid.pre.style.visibility = 'visible';
          }
        }
      }*/


      // make continue button appear when video ends (WORKS)
      /*$("#continue_button").hide();
      vid_pre.addEventListener('ended', function(){
        $("#continue_button").show();
      })

 
      // show continue button after preview
      /*setTimeout(function(){
        $("#vid_table tr").hide();
        $("#continue_button").offset({top: (window.innerHeight/2)-(BUTTON_HEIGHT/2), left: (window.innerWidth/2)-(CTE_BUTTON_WIDTH/2)})
        if (document.getElementById('video').ended == true){
        //  $("#continue_button").show();
        $("#continue_button").show(); }, 2000); // preview imgs for 2 secs*/

        // HANDLING SELECTION
        // highlight selection in red, pause webgazer, disaplay selection for 1s before clearing
        vid_pre.onclick = function(){
          var id = $(this).attr("id");
          if (document.getElementById("aud").ended & exp.endPreview == true){
          exp.clicked = id;
          $(this).css("border","2px solid red");
          webgazer.pause();
          // next button appears after 1s to continue to next trial.
          /** NB there's a tiny bug s.t. the first time the Next button appears, it's slightly off center vertically.
          in terms of analysis, this doesn't matter too much as there's always going to be enough padding around the central button area that the difference is negligble.
          But it's annoying, and I can't figure out why it's happening.  If you find the bug and fix it please tell me your secrets! */
          setTimeout(function(){
            $("#vid_table tr").remove();
            $("#next_button").show(); }, 1000);
          }
        };

      vid_td.appendChild(vid_pre);
      tr.appendChild(vid_td);
    }
    table.setAttribute('id', 'vid_table');
    table.appendChild(tr);
    document.getElementById("imgwrapper").appendChild(table);
  };




  // EXPERIMENT RUN
  $('.slide').hide(); //hide everything

  //make sure turkers have accepted HIT (or you're not in mturk)
  $("#windowsize_err").hide();
  $("#start_button").click(function() {
    if (turk.previewMode) {
      $("#mustaccept").show();
    } else {
      $("#start_button").click(function() {$("#mustaccept").show();});
      if (window.innerWidth >=  MIN_WINDOW_WIDTH){
        exp.startT = Date.now();
        exp.go();
        // set up canvas for webgazer
        ClearCanvas();
        helpModalShow();
        $("#start_calibration").hide();
        $("#begin_task").hide();
      }
      else {
          $("#windowsize_err").show();
      }
    }
  });

  $(".response_button").click(function(){
    var val = $(this).val();
    _s.continue_button(val);
  });
  exp.go(); //show first slide
}
