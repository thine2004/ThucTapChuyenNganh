package com.example.demo.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping("/")
    public String index() {
        return "index";
    }

    @GetMapping("/about")
    public String about() {
        return "about";
    }

    @GetMapping("/shop")
    public String shop() {
        return "shop";
    }
    @GetMapping("/blog")
    public String blog() {
        return "blog";
    }
    @GetMapping("/cart")
    public String cart() {
        return "cart";
    }
    @GetMapping("/checkout")
    public String checkout() {
        return "checkout";
    }
    @GetMapping("/contact")
    public String contact() {
        return "contact";
    }
    @GetMapping("/services")
    public String services() {
        return "services";
    }
    @GetMapping("/thankyou")
    public String thankyou() {
        return "thankyou";
    }
}
