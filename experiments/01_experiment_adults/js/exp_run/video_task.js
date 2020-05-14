
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
      descriptor_name = descriptor.item;
      descriptor_fnames = _.shuffle(vid_fnames[descriptor_name])
      vid1_fname = descriptor_fnames[0]
      vid2_fname = descriptor_fnames[1]
      exp.play_videos(); // show videos

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
        exp.keep_going = false;
        this.log_responses();
        console.log(exp.data_trials)
        _stream.apply(this);
        exp.tlist = [];
        exp.xlist = [];
        exp.ylist = [];
    },

    log_responses : function (){
      exp.data_trials.push({
        "condition": exp.condition,
        "descriptor" : descriptor_name,
        'left_video' : vid1_fname,
        'right_video' : vid2_fname,
        "start_time" : _s.trial_start,
        "current_windowW" : window.innerWidth,
        "current_windowH" : window.innerHeight,
        "end_pre1_time" : exp.end_pre1_time,
        "pre1_duration" : exp.end_pre1_time - _s.trial_start,
        "end_pre2_time" : exp.end_pre2_time,
        "pre2_duration" : exp.end_pre2_time - exp.end_pre1_time,
        "end_contrast_time" : exp.end_contrast_time,
        "contrast_duration" : exp.end_contrast_time - exp.end_pre2_time,
        "end_audio_time" : exp.end_audio_time,
        "audio_duration" : exp.end_audio_time - exp.end_contrast_time,
        "end_event_time" : exp.end_event_time,
        "event_duration": exp.end_event_time - exp.end_contrast_time,
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
  NUM_CONDITIONS = 2;
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
  exp.clicked = null;
  exp.train_descriptors = [];
  exp.filler_descriptors = []
  exp.test_descriptors = [];
  exp.gen_descriptors = []
  exp.descriptors = [];
  exp.condition = _.sample(["noun", "verb"]);
  for (var i = 0; i<descriptors.length; i++){
    if (descriptors[i].condition == exp.condition)
      exp.train_descriptors.push(descriptors[i]);
    else if (descriptors[i].condition == (exp.condition + "_filler"))
      exp.filler_descriptors.push(descriptors[i]);
    else if (descriptors[i].condition == "test")
      exp.test_descriptors.push(descriptors[i]);
    else if (descriptors[i].condition == "gen") // the trial where we test whether syntactic adaptation generalizes
      exp.gen_descriptors.push(descriptors[i]);
  }
  // shuffle training, filler, and test descriptors
  // if we had >1 generalize trial, we'd shuffle that too
  exp.train_descriptors = _.shuffle(exp.train_descriptors);
  exp.test_descriptors = _.shuffle(exp.test_descriptors);
  exp.filler_descriptors = _.shuffle(exp.filler_descriptors); 
  
  // add training, then test, then generalize trials to exp.descriptors
  for (var i = 0; i<(exp.train_descriptors.length/2); i++){
    exp.descriptors.push(exp.train_descriptors[i]);
  }
  for (var i = 0; i<exp.filler_descriptors.length; i++){
    exp.descriptors.push(exp.filler_descriptors[i]);
  }
  for (var i = (exp.train_descriptors.length/2); i<exp.train_descriptors.length; i++){
    exp.descriptors.push(exp.train_descriptors[i]);
  }
  for (var i = 0; i<(exp.test_descriptors.length); i++){
    exp.descriptors.push(exp.test_descriptors[i]);
  }
  for (var i = 0; i<(exp.gen_descriptors.length); i++){
    exp.descriptors.push(exp.gen_descriptors[i]);
  }


  //create experiment order and make slides
  exp.structure=["i0",  "training_and_calibration", "sound_test", "single_trial", "subj_info", "thanks"];
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
  exp.play_videos = function(){

    ///////////////// PREVIEW VIDEOS: LEFT, THEN RIGHT \\\\\\\\\\\\\\\\\
    if (document.getElementById("vid_table") != null){
      $("#vid_table tr").remove();
    }
    var table_pre = document.createElement("table");
    var tr_pre = document.createElement('tr');

    var cellwidth = MIN_WINDOW_WIDTH/NUM_COLS
    $("#continue_button").offset({top: (window.innerHeight/2)-(BUTTON_HEIGHT/2), left: (window.innerWidth/2)-(CTE_BUTTON_WIDTH/2)})
    $("#next_button").offset({top: (window.innerHeight/2)-(BUTTON_HEIGHT/2), left: (window.innerWidth/2)-(NXT_BUTTON_WIDTH/2)})

    // first video
    var vid1_td = document.createElement('td');
      vid1_td.style.width = cellwidth+'px';

      //var vid1_fname = vid_fnames[descriptor_name][0];
      var vid1_pre = document.createElement('video');
      vid1_pre.src = 'static/videos/preview_'+vid1_fname+'.mov';
      vid1_pre.id = vid1_fname + '_pre';
      vid1_pre.autoplay = true
      vid1_pre.height = VID_HEIGHT;
      vid1_pre.width = VID_WIDTH;
      vid1_pre.style.marginRight = (cellwidth - VID_WIDTH)  + 'px';

    // second video
    var vid2_td = document.createElement('td');
      vid2_td.style.width = cellwidth+'px';

      //var vid2_fname = vid_fnames[descriptor_name][1];
      var vid2_pre = document.createElement('video');
      vid2_pre.src = 'static/videos/preview_'+vid2_fname+'.mov';
      vid2_pre.id = vid2_fname + '_pre';
      vid2_pre.height = VID_HEIGHT;
      vid2_pre.width = VID_WIDTH;
      vid2_pre.style.marginLeft = (cellwidth - VID_WIDTH)  + 'px';

      // create table with videos
      vid1_td.appendChild(vid1_pre);
      vid2_td.appendChild(vid2_pre);
      tr_pre.appendChild(vid1_td);
      tr_pre.appendChild(vid2_td);
    //}
    table_pre.setAttribute('id', 'vid_table');
    table_pre.appendChild(tr_pre);
    document.getElementById("imgwrapper").appendChild(table_pre);

    // hide second video until first video is done playing
    vid2_pre.style.visibility = 'hidden'; // works for now
    $("#continue_button").hide();
    vid1_pre.addEventListener('ended', function(){
      exp.end_pre1_time = Date.now()
      vid1_pre.style.visibility = 'hidden';
      vid2_pre.style.visibility = 'visible';
      vid2_pre.play();
    })

    /* set fixation point (TODO: WHAT IS FIXATION POINT?)
    setTimeout(function(){
      vid1_pre.style.visibility = 'visible';}, 1000);*/


    //////////////////// CONTRAST: BOTH VIDEOS AT ONCE \\\\\\\\\\\\\\\\\\\
    vid2_pre.addEventListener('ended', function(){
      exp.end_pre2_time = Date.now()
      if (document.getElementById("vid_table") != null){
        $("#vid_table tr").remove();
      }
      var table_con = document.createElement("table");
      var tr_con = document.createElement('tr');

      var cellwidth = MIN_WINDOW_WIDTH/NUM_COLS
  
      // first video
      var vid1_td = document.createElement('td');
      vid1_td.style.width = cellwidth+'px';

      //var vid1_fname = vid_fnames[descriptor_name][0];
      var vid1_con = document.createElement('video');
      vid1_con.src = 'static/videos/contrast_'+vid1_fname+'.mov';
      vid1_con.id = vid1_fname + '_con';
      vid1_con.autoplay = true;
      vid1_con.height = VID_HEIGHT;
      vid1_con.width = VID_WIDTH;
      vid1_con.style.marginRight = (cellwidth - VID_WIDTH)  + 'px';

    // second video
      var vid2_td = document.createElement('td');
        vid2_td.style.width = cellwidth+'px';

      //var vid2_fname = vid_fnames[descriptor_name][1];
      var vid2_con = document.createElement('video');
      vid2_con.src = 'static/videos/contrast_'+vid2_fname+'.mov';
      vid2_con.id = vid2_fname + '_con';
      vid2_con.autoplay = true;
      vid2_con.height = VID_HEIGHT;
      vid2_con.width = VID_WIDTH;
      vid2_con.style.marginLeft = (cellwidth - VID_WIDTH)  + 'px';

      // create table with videos
      vid1_td.appendChild(vid1_con);
      vid2_td.appendChild(vid2_con);
      tr_con.appendChild(vid1_td);
      tr_con.appendChild(vid2_td);

      table_con.setAttribute('id', 'vid_table');
      table_con.appendChild(tr_con);
      document.getElementById("imgwrapper").appendChild(table_con);


      ///////////////////// BLANK SCREEN: EVENT AUDIO \\\\\\\\\\\\\\\\\\\\
      vid2_con.addEventListener('ended', function(){
        exp.end_contrast_time = Date.now()
        if (document.getElementById("vid_table") != null){
          $("#vid_table tr").remove();
        }

        var blk_audio = document.createElement('audio');
        blk_audio.src = 'static/audio/Black_' + descriptor_name + '_' + exp.condition +'.wav';
        blk_audio.autoplay = true;


        /////////////////// EVENT: BOTH VIDEOS AT ONCE \\\\\\\\\\\\\\\\\\\\
        blk_audio.addEventListener('ended', function(){
          exp.end_audio_time = Date.now()
          if (document.getElementById("vid_table") != null){
            $("#vid_table tr").remove();
          }
          var table_ev = document.createElement("table");
          var tr_ev = document.createElement('tr');

          var cellwidth = MIN_WINDOW_WIDTH/NUM_COLS
     
          // first video
          var vid1_td = document.createElement('td');
            vid1_td.style.width = cellwidth+'px';

          //var vid1_fname = vid_fnames[descriptor_name][0];
          var vid1_ev = document.createElement('video');
          vid1_ev.src = 'static/videos/Event_'+vid1_fname+'.mov';
          vid1_ev.id = vid1_fname + '_ev';
          vid1_ev.autoplay = true;
          vid1_ev.height = VID_HEIGHT;
          vid1_ev.width = VID_WIDTH;
          vid1_ev.style.marginRight = (cellwidth - VID_WIDTH)  + 'px';

          // second video
          var vid2_td = document.createElement('td');
            vid2_td.style.width = cellwidth+'px';

          //var vid2_fname = vid_fnames[descriptor_name][1];
          var vid2_ev = document.createElement('video');
          vid2_ev.src = 'static/videos/Event_'+vid2_fname+'.mov';
          vid2_ev.id = vid2_fname + '_ev';
          vid2_ev.autoplay = true;
          vid2_ev.height = VID_HEIGHT;
          vid2_ev.width = VID_WIDTH;
          vid2_ev.style.marginLeft = (cellwidth - VID_WIDTH)  + 'px';

          // create table with videos
          vid1_td.appendChild(vid1_ev);
          vid2_td.appendChild(vid2_ev);
          tr_ev.appendChild(vid1_td);
          tr_ev.appendChild(vid2_td);

          table_ev.setAttribute('id', 'vid_table');
          table_ev.appendChild(tr_ev);
          document.getElementById("imgwrapper").appendChild(table_ev);

          // when the event videos are over, add in a next button
          vid2_ev.addEventListener('ended', function(){
            exp.end_event_time = Date.now()
            setTimeout(function(){
            $("#img_table tr").remove();
            $("#next_button").show(); }, 100);
          });
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

  $(".response_button").click(function(){
    var val = $(this).val();
    _s.continue_button(val);
  });
  exp.go(); //show first slide
}
