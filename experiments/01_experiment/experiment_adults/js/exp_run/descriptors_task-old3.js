

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
      //$("#aud").hide();
      descriptor_name = descriptor.item
      exp.display_videos(); // get imgs, show them

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
      //  $(".err").show();
      //} else {
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

    /*continue : function(e){
      exp.endPreview = true
      exp.endPreviewTime = Date.now()
      $("#img_table tr").show();
      $("#continue_button").hide();
      var aud = $("#aud").attr("src", 'static/audio/wav/'+descriptor_name+".wav")[0];
      // get audio duration:
      aud.onloadedmetadata = function() {
        aud_dur = aud.duration;
      };
      },*/

    log_responses : function (){
      exp.data_trials.push({
        "descriptor" : descriptor_name,
        "selected_img" : exp.clicked,
        'left_choice' : img_fnames[descriptor_name][0],
        'right_choice' : img_fnames[descriptor_name][1],
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
  VID_HEIGHT = 226;
  VID_WIDTH = 400;

  //Initialize data frames
  exp.accuracy_attempts = [];
  exp.data_trials = [];
  exp.tlist = []; //TESTING
  exp.xlist = [];
  exp.ylist = [];
  exp.clicked = null
  exp.descriptors = _.shuffle(descriptors)   // shuffle list of descriptors

  //create experiment order/make slides
  exp.structure=["i0",  "training_and_calibration", "sound_test", "single_trial",  "subj_info", "thanks"];
  exp.slides = make_slides(exp);
  exp.nQs = utils.get_exp_length();

  exp.system = {
    Browser : BrowserDetect.browser,
    OS : BrowserDetect.OS,
    screenH: screen.height,
    screenW: screen.width,
    windowH: window.innerHeight,
    windowW: window.innerWidth,
    imageH: VID_HEIGHT,
    imageW: VID_WIDTH
  };


  // EXPERIMENT FUNCTIONS
  exp.display_imgs = function(){
    if (document.getElementById("table") != null){
      $("#table tr").remove();
    }
    var table = document.createElement("table");
    var tr = document.createElement('tr');

    var cellwidth = MIN_WINDOW_WIDTH/NUM_COLS
    $("#continue_button").offset({top: (window.innerHeight/2)-(BUTTON_HEIGHT/2), left: (window.innerWidth/2)-(CTE_BUTTON_WIDTH/2)})
    $("#next_button").offset({top: (window.innerHeight/2)-(BUTTON_HEIGHT/2), left: (window.innerWidth/2)-(NXT_BUTTON_WIDTH/2)})

    // PREVIEW

    // first video
    var vid1_td = document.createElement('td');
      vid1_td.style.width = cellwidth+'px';

      var vid1_fname = vid_fnames[descriptor_name][0];
      var vid1_pre = document.createElement('video');
      vid1_pre.src = 'static/videos/preview_'+vid1_fname+'.mov';
      vid1_pre.id = vid1_fname;
      console.log(vid1_pre.id);
      vid1_pre.autoplay = true
      vid1_pre.muted = true
      vid1_pre.height = VID_HEIGHT;
      vid1_pre.width = VID_WIDTH;
      vid1_pre.style.marginRight = (cellwidth - VID_WIDTH)  + 'px';

    // second video
    var vid2_td = document.createElement('td');
      vid2_td.style.width = cellwidth+'px';

      var vid2_fname = vid_fnames[descriptor_name][1];
      var vid2_pre = document.createElement('video');
      vid2_pre.src = 'static/videos/preview_'+vid2_fname+'.mov';
      vid2_pre.id = vid2_fname;
      console.log(vid2_pre.id);
      vid2_pre.muted = true
      vid2_pre.height = VID_HEIGHT;
      vid2_pre.width = VID_WIDTH;
      vid2_pre.style.marginLeft = (cellwidth - VID_WIDTH)  + 'px';

      /*
        // HANDLING SELECTION
        // highlight selection in red, pause webgazer, disaplay selection for 1s before clearing
        img.onclick = function(){
          var id = $(this).attr("id");
          if (document.getElementById("aud").ended & exp.endPreview == true){
          exp.clicked = id;
          $(this).css("border","2px solid red");
          webgazer.pause();
          // next button appears after 1s to continue to next trial.
          /** NB there's a tiny bug s.t. the first time the Next button appears, it's slightly off center vertically.
          in terms of analysis, this doesn't matter too much as there's always going to be enough padding around the central button area that the difference is negligble.
          But it's annoying, and I can't figure out why it's happening.  If you find the bug and fix it please tell me your secrets! */
          /*setTimeout(function(){
            $("#img_table tr").remove();
            $("#next_button").show(); }, 1000);
          }
        };*/

      vid1_td.appendChild(vid1_pre);
      vid2_td.appendChild(vid2_pre);
      tr.appendChild(vid1_td);
      tr.appendChild(vid2_td);
    
    table.setAttribute('id', 'table')
    table.appendChild(tr);
    document.getElementById("imgwrapper").appendChild(table);

    vid2_pre.style.visibility = 'hidden'; // works for now
    $("#continue_button").hide();
    vid1_pre.addEventListener('ended', function(){
      vid1_pre.style.visibility = 'hidden';
      vid2_pre.style.visibility = 'visible';
      vid2_pre.play();
    })

    // CONTRAST: BOTH VIDEOS AT ONCE

    vid2_pre.addEventListener('ended', function(){
      if (document.getElementById("table") != null){
        $("#table tr").remove();
      }
      var table = document.createElement("table");
      var tr = document.createElement('tr');

      var cellwidth = MIN_WINDOW_WIDTH/NUM_COLS;

      // first video
      var vid1_td = document.createElement('td');
      vid1_td.style.width = cellwidth+'px';

      var vid1_fname = vid_fnames[descriptor_name][0];
      var vid1_con = document.createElement('video');
      vid1_con.src = 'static/videos/contrast_'+vid1_fname+'.mov';
      vid1_con.id = vid1_fname;
      console.log(vid1_con.id);
      vid1_con.autoplay = true;
      vid1_con.muted = true;
      vid1_con.height = VID_HEIGHT;
      vid1_con.width = VID_WIDTH;
      vid1_con.style.marginRight = (cellwidth - VID_WIDTH)  + 'px';

      // second video
      var vid2_td = document.createElement('td');
        vid2_td.style.width = cellwidth+'px';

      var vid2_fname = vid_fnames[descriptor_name][1];
      var vid2_con = document.createElement('video');
      vid2_con.src = 'static/videos/contrast_'+vid2_fname+'.mov';
      vid2_con.id = vid2_fname;
      console.log(vid2_con.id);
      vid2_con.autoplay = true;
      vid2_con.muted = true;
      vid2_con.height = VID_HEIGHT;
      vid2_con.width = VID_WIDTH;
      vid2_con.style.marginLeft = (cellwidth - VID_WIDTH)  + 'px';

      vid1_td.appendChild(vid1_con);
      vid2_td.appendChild(vid2_con);
      tr.appendChild(vid1_td);
      tr.appendChild(vid2_td);

      table.setAttribute('id', 'Stable');
      table.appendChild(tr);
      document.getElementById("imgwrapper").appendChild(table);


      // EVENT: BOTH VIDEOS AT ONCE
      vid2_con.addEventListener('ended', function(){
        if (document.getElementById("table") != null){
          $("#table tr").remove();
        }
        var table = document.createElement("table");
        var tr = document.createElement('tr');

        var cellwidth = MIN_WINDOW_WIDTH/NUM_COLS
     
      // first video
        var vid1_td = document.createElement('td');
          vid1_td.style.width = cellwidth+'px';

        var vid1_fname = vid_fnames[descriptor_name][0];
        var vid1_ev = document.createElement('video');
        vid1_ev.src = 'static/videos/Event_'+vid1_fname+'.mov';
        vid1_ev.id = vid1_fname;
        console.log(vid1_ev.id);
        vid1_ev.autoplay = true;
        vid1_ev.muted = true;
        vid1_ev.height = VID_HEIGHT;
        vid1_ev.width = VID_WIDTH;
        vid1_ev.style.marginRight = (cellwidth - VID_WIDTH)  + 'px';

    // second video
        var vid2_td = document.createElement('td');
          vid2_td.style.width = cellwidth+'px';

        var vid2_fname = vid_fnames[descriptor_name][1];
        var vid2_ev = document.createElement('video');
        vid2_ev.src = 'static/videos/Event_'+vid2_fname+'.mov';
        vid2_ev.id = vid2_fname;
        console.log(vid2_ev.id);
        vid2_ev.autoplay = true;
        vid2_ev.muted = true;
        vid2_ev.height = VID_HEIGHT;
        vid2_ev.width = VID_WIDTH;
        vid2_ev.style.marginLeft = (cellwidth - VID_WIDTH)  + 'px';

        vid1_td.appendChild(vid1_ev);
        vid2_td.appendChild(vid2_ev);
        tr.appendChild(vid1_td);
        tr.appendChild(vid2_td);

        table.setAttribute('id', 'table');
        table.appendChild(tr);
        document.getElementById("imgwrapper").appendChild(table);

      // when the event videos are over, add in a next button
        vid2_ev.addEventListener('ended', function(){
          setTimeout(function(){
          $("#img_table tr").remove();
          $("#next_button").show(); }, 1000);
        });
      });
    });
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

  /*$(".response_button").click(function(){
    var val = $(this).val();
    _s.continue_button(val);
  });*/
  exp.go(); //show first slide
}
