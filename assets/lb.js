/* ----------  Ajax Code ---------- */
$(document).on("submit", 'form[action="/cart/add"], form[action="/de-ch/cart/add"], form[action="/en/cart/add"], form[action="/en-ch/cart/add"]', function (e) {
  e.preventDefault();
  
  // Überprüfen, auf welcher Sprach- bzw. Landesversion wir uns befinden
  var path = window.location.pathname;
  var isSwissPage = path.startsWith('/de-ch') || path.startsWith('/en-ch');
  var isEnglishPage = path.startsWith('/en') || path.startsWith('/en-ch');
  
  // Passe die URL entsprechend der Seite an
  var actionUrl;
  if (isSwissPage) {
    actionUrl = isEnglishPage ? "/en-ch/cart/add.js" : "/de-ch/cart/add.js";
  } else {
    actionUrl = isEnglishPage ? "/en/cart/add.js" : "/cart/add.js";
  }
  
  var p_data = $(this).serialize();
  
  $.ajax({
    type: "POST",
    context: this,
    url: actionUrl,  // Nutze die angepasste URL hier
    data: p_data,
    dataType: "json",
    success: function (response) {
      min_cart();
      $(".cart-nav").trigger("click");
    },
  });
  
  cartloader();
});





/*START: UPDATE CART WHEN PAGEFLY ITEM IS ADDED*/
const slidecartPagefly = setInterval(function () {
  if (window.__pagefly_helper_store__) {
    window.__pagefly_helper_store__.subscribe(function () {
      min_cart();
    });

    clearInterval(slidecartPagefly);
  }
}, 100);

setTimeout(() => {
  clearInterval(slidecartPagefly);
}, 5000);
/*END: UPDATE CART WHEN PAGEFLY ITEM IS ADDED*/





$(document).on("click", ".qtyplus", function (e) {
  e.preventDefault();
  /*fieldName = $(this).attr('field');
        var currentVal = parseInt($('input[name='+fieldName+']').val());
        if (!isNaN(currentVal)) {
            $(this).parent().parent().find('input[name='+fieldName+']').val(currentVal + 1);
        } else {
            $(this).parent().parent().find('input[name='+fieldName+']').val(1);
        }*/
  var count = parseInt(
    $(this).parent().parent().find('input[name="quantity"]').val()
  );
  var plus_qty = count + 1;
  var vid = $(this).attr("data-line-id");
  var p_data = {
    line: vid,
    quantity: plus_qty,
  };
  $.ajax({
    type: "POST",
    context: this,
    url: "/cart/change.js",
    data: p_data,
    dataType: "json",
    success: function (responce) {
      min_cart();
    },
  });
  cartloader();
});

$(document).on("click", ".qtyminus", function (e) {
  var count = parseInt(
    $(this).parent().parent().find('input[name="quantity"]').val()
  );
  var minus_qty = count - 1;
  console.log(minus_qty);
  var vid = $(this).attr("data-line-id");
  var p_data = {
    line: vid,
    quantity: minus_qty,
  };
  $.ajax({
    type: "POST",
    url: "/cart/change.js",
    data: p_data,
    dataType: "json",
    success: function (responce) {
      min_cart();
    },
  });
  cartloader();
});

$(document).on("click", ".qtydelete", function (e) {
  e.preventDefault();
  var vid = $(this).attr("data-cart-remove-id");
  var p_data = {
    id: vid,
    quantity: 0,
  };
  $.ajax({
    type: "POST",
    context: this,
    url: "/cart/change.js",
    data: p_data,
    dataType: "json",
    success: function (responce) {
      min_cart();
    },
  });
  cartloader();
});

function min_cart() {
  $.ajax({
    url: "/",
    type: "GET",
    success: function (data) {
            
      $(".lb-header-cart").html(
        $(data).find(".lb-header-cart").html()
      );
      $(".lb-cart-drawer-box-header-carticon").html(
        $(data).find(".lb-cart-drawer-box-header-carticon").html()
      );
      $(".lb-cart-drawer-footer").html(
        $(data).find(".lb-cart-drawer-footer").html()
      );
      $(".lb-cart-drawer-item-box").html(
        $(data).find(".lb-cart-drawer-item-box").html()
      );
      $(".lb-cart-drawer-empty").html(
        $(data).find(".lb-cart-drawer-empty").html()
      );
      $(".lb-cart-drawer-preinfo-holder").html(
        $(data).find(".lb-cart-drawer-preinfo-holder").html()
      );
      $(".staffelbox1").html(
        $(data).find(".staffelbox1").html() 
      ); 
      $(".lb-cart-freeshipping-bar-holder").html(
        $(data).find(".lb-cart-freeshipping-bar-holder").html()
      );
      $(".updaterr").html(
        $(data).find(".updaterr").html()
      );
    },
  });
}


function cartloader() {
  $(".lb-cart-drawer-box-loader")
    .addClass("lb-cart-drawer-box-loader-animate")
    .delay(500)
    .queue(function (next) {
      $(".lb-cart-drawer-box-loader").removeClass(
        "lb-cart-drawer-box-loader-animate"
      );
      next();
    });
}




/* ----------  Scripts for opener ---------- */

/*  Overlay upper closer  */
$(".lb-cart-drawer-closer-upper").click(function lb_overlay_closer() {
  $(".lb-cart-drawer-overlay-upper").removeClass("lb-cart-drawer-overlay-active");
  $("html").removeClass("all-noscroll");
  $(".lb-cart-drawer-box").removeClass("lb-cart-drawer-box-active");
  $(".lb-cart-drawer-overlay-under").removeClass("lb-header-search-bar-active");
  $(".lb-mobile-nav").removeClass("lb-mobile-nav-active");
  $("body").removeClass("body-scroll-stop");
});

/*  Overlay under opener  */
$(".lb-cart-drawer-closer-under").click(function lb_overlay_closer_under() {
  $(".lb-cart-drawer-overlay-under").toggleClass(
    "lb-cart-drawer-overlay-active"
  );
  $(".lb-header-search-bar").toggleClass("lb-header-search-bar-active");
});

/*  Cart layer popup  */
if ($("body").hasClass("cart-layer-popup")) {
  $(".lb-cart-drawer-opener.lb-header-cart").click(function lb_cart_opener() {
    $(".lb-cart-drawer-box").addClass("lb-cart-drawer-box-active");
    $(".lb-cart-drawer-overlay-upper").addClass(
      "lb-cart-drawer-overlay-active"
    );
  });

  $(".lb-cart-drawer-opener.ab-btn").click(function lb_cart_opener() {
    setTimeout(function () {
      $("#adddedToCart").addClass("active");
    }, 1000);
    setTimeout(function () {
      $("#adddedToCart").removeClass("active");
    }, 4000);
  });
} else {
  $(".lb-cart-drawer-opener").click(function lb_cart_opener() {
    $(".lb-cart-drawer-box").addClass("lb-cart-drawer-box-active");
    $("html").addClass("all-noscroll");
    $(".lb-cart-drawer-overlay-upper").addClass("lb-cart-drawer-overlay-active");
    $("body").addClass("body-scroll-stop");
  });
} 

/*  Search opener  */
$(".lb-header-search-icon").click(function lb_search_opener() {
  $(".lb-header-search-bar").toggleClass("lb-header-search-bar-active");
  $(".lb-cart-drawer-overlay-under").toggleClass(
    "lb-cart-drawer-overlay-active"
  );
});

/*  Mobile Navigation opener  */
$(".lb-header-burger-menu").click(function lb_nav_opener() {
  $(".lb-cart-drawer-overlay-upper").addClass("lb-cart-drawer-overlay-active");
  $(".lb-mobile-nav").addClass("lb-mobile-nav-active");
});

/*  Mobile Sub Navigation opener  */
$(".lb-mobile-nav-main-item-link").click(function lb_nav_opener() {
  $(this)
    .next(".lb-mobile-nav-sub-item")
    .toggleClass("lb-mobile-nav-sub-item-active");
  $(this)
    .children(".lb-mobile-nav-main-item-arrow")
    .toggleClass("lb-mobile-nav-main-item-arrow-active");
});

/*  Desktop Navigation Overlay  */
$(".lb-header-nav-main-inner-item-sub").mouseenter(
  function lb_nav_sub_opener_in() {
    $(".lb-cart-drawer-overlay-under").addClass(
      "lb-cart-drawer-overlay-active"
    );
  }
);

$(".lb-header-nav-main-inner-item-sub").mouseleave(
  function lb_nav_sub_opener_out() {
    $(".lb-cart-drawer-overlay-under").removeClass(
      "lb-cart-drawer-overlay-active"
    );
    $(".lb-header-search-bar").removeClass("lb-header-search-bar-active");
  }
);

/*  Reset Password  */
$(".lb-reset-password").click(function lb_reset_password() {
  $(".lb-password-reset-form").toggleClass("lb-password-reset-form-active");
});


















